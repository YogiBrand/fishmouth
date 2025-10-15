import uuid
from typing import Callable
from fastapi import Request, Response

def request_id_middleware_factory(header_name: str = "X-Request-ID") -> Callable:
    async def middleware(request: Request, call_next):
        req_id = request.headers.get(header_name) or str(uuid.uuid4())
        response: Response = await call_next(request)
        response.headers[header_name] = req_id
        return response
    return middleware
