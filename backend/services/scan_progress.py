"""In-memory progress broadcaster for area scans."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any, AsyncIterator, Dict, Set


class ProgressNotifier:
    """Simple pub/sub mechanism to stream scan progress to WebSocket clients."""

    def __init__(self) -> None:
        self._subscribers: Dict[int, Set[asyncio.Queue]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def register(self, scan_id: int) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self._subscribers[scan_id].add(queue)
        return queue

    async def unregister(self, scan_id: int, queue: asyncio.Queue) -> None:
        async with self._lock:
            subscribers = self._subscribers.get(scan_id)
            if not subscribers:
                return
            subscribers.discard(queue)
            if not subscribers:
                self._subscribers.pop(scan_id, None)

    async def publish(self, scan_id: int, payload: Dict[str, Any]) -> None:
        """Push a progress update to all listeners."""
        async with self._lock:
            subscribers = list(self._subscribers.get(scan_id, set()))
        if not subscribers:
            return
        for queue in subscribers:
            # Avoid blocking the publisher – drop update if queue is full
            if queue.qsize() > 10:
                continue
            await queue.put(payload)

    async def stream(self, scan_id: int) -> AsyncIterator[Dict[str, Any]]:
        queue = await self.register(scan_id)
        try:
            while True:
                update = await queue.get()
                yield update
        finally:
            await self.unregister(scan_id, queue)


progress_notifier = ProgressNotifier()
