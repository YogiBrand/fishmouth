from starlette.middleware.base import BaseHTTPMiddleware
import httpx, time, os

# Support multiple telemetry endpoints (comma-separated) with sensible local fallback
_urls_env = os.getenv("TELEMETRY_URLS") or os.getenv("TELEMETRY_URL", "http://localhost:8030,http://telemetry_gw_8030:8030")
TELEMETRY_URLS = [u.strip() for u in _urls_env.split(",") if u.strip()]
SERVICE_NAME = os.getenv("SERVICE_NAME","unknown")

class TelemetryMW(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = time.time()
        resp = await call_next(request)
        latency = int((time.time() - start) * 1000)

        # Avoid recursive telemetry calls when the gateway processes /event or /cost
        if request.url.path in ("/event", "/cost"):
            return resp

        payload = {
            "service": SERVICE_NAME,
            "route": str(request.url.path),
            "action": "api_call",
            "quantity": 1,
            "unit": "call",
            "meta": {
                "status": resp.status_code,
                "latency_ms": latency,
                "method": request.method,
            },
        }
        # Attempt to send to first reachable telemetry endpoint, fail-quietly
        for base_url in TELEMETRY_URLS:
            try:
                async with httpx.AsyncClient(timeout=1.0) as c:
                    await c.post(f"{base_url}/event", json=payload)
                break
            except Exception:
                continue
        return resp
