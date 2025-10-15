"""Dynamic application configuration endpoint (PRD-15)."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Request, Response


router = APIRouter(prefix="/api/v1/app-config", tags=["app-config"])


_CONFIG_CACHE: Dict[str, Any] = {
    "etag": None,
    "data": None,
    "mtime": None,
    "path": None,
}

_ROOT_DIR = Path(__file__).resolve().parents[4]
_CONFIG_PATH_CANDIDATES = (
    _ROOT_DIR / "frontend" / "src" / "config" / "appConfig.json",
    _ROOT_DIR / "config" / "appConfig.json",
    Path(__file__).resolve().parents[2] / "config" / "appConfig.json",
)


def _load_config() -> Dict[str, Any]:
    for candidate in _CONFIG_PATH_CANDIDATES:
        if candidate.exists():
            stat = candidate.stat()
            if _CONFIG_CACHE["mtime"] != stat.st_mtime:
                text = candidate.read_text(encoding="utf-8")
                data = json.loads(text)
                etag = hashlib.sha1(text.encode("utf-8")).hexdigest()
                _CONFIG_CACHE.update(
                    {
                        "etag": etag,
                        "data": data,
                        "mtime": stat.st_mtime,
                        "path": str(candidate),
                    }
                )
            return _CONFIG_CACHE
    raise FileNotFoundError("appConfig.json not found")


@router.get("")
async def get_app_config(request: Request, response: Response) -> Dict[str, Any]:
    try:
        cache = _load_config()
    except FileNotFoundError as exc:  # noqa: BLE001
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    etag = cache.get("etag")
    if etag and request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": "max-age=120"})

    response.headers["Cache-Control"] = "max-age=120"
    if etag:
        response.headers["ETag"] = etag

    payload = dict(cache.get("data") or {})
    if cache.get("path"):
        payload.setdefault("_meta", {})
        payload["_meta"]["source"] = cache["path"]

    return payload
