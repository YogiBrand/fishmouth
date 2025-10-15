"""Request scoped logging helpers."""

from __future__ import annotations

import uuid
from typing import Callable

from fastapi import Request, Response


def request_id_middleware_factory(header_name: str = "X-Request-ID") -> Callable:
    """Attach a request ID to the request/response cycle."""

    async def middleware(request: Request, call_next):
        request_id = request.headers.get(header_name) or str(uuid.uuid4())
        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers[header_name] = request_id
        return response

    return middleware


__all__ = ["request_id_middleware_factory"]
