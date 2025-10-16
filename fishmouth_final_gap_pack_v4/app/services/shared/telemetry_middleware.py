from starlette.middleware.base import BaseHTTPMiddleware
import httpx, time, os

TELEMETRY_URL = os.getenv("TELEMETRY_URL","http://telemetry_gw_8030:8030")
SERVICE_NAME = os.getenv("SERVICE_NAME","unknown")

class TelemetryMW(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = time.time()
        resp = await call_next(request)
        latency = int((time.time()-start)*1000)
        try:
            async with httpx.AsyncClient(timeout=1.0) as c:
                await c.post(f"{TELEMETRY_URL}/event", json={
                    "service": SERVICE_NAME,
                    "route": str(request.url.path),
                    "action": "api_call",
                    "quantity": 1,
                    "unit": "call",
                    "meta": {"status": resp.status_code, "latency_ms": latency}
                })
        except Exception:
            pass
        return resp
