"""Utilities for making provider integrations more resilient."""

from __future__ import annotations

import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass
from typing import Deque, Optional


class CircuitBreakerOpen(Exception):
    """Raised when the circuit is open and external calls are blocked."""


@dataclass
class _CircuitState:
    name: str
    failure_threshold: int
    recovery_timeout: float
    state: str = "closed"  # closed | open | half_open
    failure_count: int = 0
    last_failure: float = 0.0
    half_open_call_in_flight: bool = False


class CircuitBreaker:
    """Simple circuit breaker to prevent hammering unreliable providers."""

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        logger: Optional[logging.Logger] = None,
    ) -> None:
        if failure_threshold < 1:
            raise ValueError("failure_threshold must be >= 1")
        self._state = _CircuitState(
            name=name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
        )
        self._logger = logger or logging.getLogger(__name__)

    def allow_call(self) -> bool:
        """Return True when an external call is allowed."""
        if self._state.state == "open":
            elapsed = time.monotonic() - self._state.last_failure
            if elapsed >= self._state.recovery_timeout:
                self._logger.info("circuit.half_open", circuit=self._state.name)
                self._state.state = "half_open"
                self._state.half_open_call_in_flight = False
            else:
                self._logger.debug(
                    "circuit.blocked",
                    circuit=self._state.name,
                    remaining=round(self._state.recovery_timeout - elapsed, 2),
                )
                return False

        if self._state.state == "half_open":
            if self._state.half_open_call_in_flight:
                return False
            self._state.half_open_call_in_flight = True

        return True

    def record_success(self) -> None:
        """Reset the breaker on successful call."""
        if self._state.state != "closed":
            self._logger.info("circuit.closed", circuit=self._state.name)
        self._state.state = "closed"
        self._state.failure_count = 0
        self._state.half_open_call_in_flight = False

    def record_failure(self, reason: Optional[str] = None) -> None:
        """Record a failed call and open the circuit when threshold reached."""
        self._state.failure_count += 1
        self._state.last_failure = time.monotonic()
        self._state.half_open_call_in_flight = False

        if self._state.failure_count >= self._state.failure_threshold:
            if self._state.state != "open":
                self._logger.warning(
                    "circuit.open",
                    circuit=self._state.name,
                    failures=self._state.failure_count,
                    reason=reason,
                )
            self._state.state = "open"
        else:
            self._state.state = "half_open"
            self._logger.debug(
                "circuit.failure",
                circuit=self._state.name,
                failures=self._state.failure_count,
                reason=reason,
            )

    def force_close(self) -> None:
        """Manually close the circuit (primarily for testing)."""
        self._state.state = "closed"
        self._state.failure_count = 0
        self._state.half_open_call_in_flight = False

    @property
    def state(self) -> str:
        return self._state.state


class AsyncRateLimiter:
    """Token bucket style rate limiter for async workflows."""

    def __init__(self, max_calls: int, period_seconds: float) -> None:
        self._max_calls = max_calls
        self._period = period_seconds
        self._timestamps: Deque[float] = deque()
        self._lock = asyncio.Lock()

    def _disabled(self) -> bool:
        return self._max_calls <= 0 or self._period <= 0

    async def acquire(self) -> None:
        if self._disabled():
            return

        while True:
            async with self._lock:
                now = time.monotonic()
                while self._timestamps and now - self._timestamps[0] >= self._period:
                    self._timestamps.popleft()

                if len(self._timestamps) < self._max_calls:
                    self._timestamps.append(now)
                    return

                wait_time = self._period - (now - self._timestamps[0])

            await asyncio.sleep(wait_time)

    async def __aenter__(self) -> "AsyncRateLimiter":
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None
