"""Lightweight pub/sub hub for dashboard activity updates."""

from __future__ import annotations

import asyncio
from typing import Any, Dict, Set


class ActivityNotifier:
    def __init__(self) -> None:
        self._queues: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def register(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=50)
        async with self._lock:
            self._queues.add(queue)
        return queue

    async def unregister(self, queue: asyncio.Queue) -> None:
        async with self._lock:
            self._queues.discard(queue)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        async with self._lock:
            subscribers = list(self._queues)
        if not subscribers:
            return
        for queue in subscribers:
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            await queue.put(message)

    def publish(self, event_type: str, payload: Dict[str, Any]) -> None:
        message = {"type": event_type, "payload": payload}
        asyncio.create_task(self.broadcast(message))


activity_notifier = ActivityNotifier()
