# boost/backend/services/imagery/providers.py
from typing import Optional, Dict, Any

class ImageryResult:
    def __init__(self, image_bytes: bytes, meta: Dict[str, Any]):
        self.image, self.meta = image_bytes, meta

class BaseProvider:
    name = "base"; cost_per_request = 0.0
    def get_tile(self, lat: float, lng: float, zoom: int = 19) -> Optional[ImageryResult]:
        raise NotImplementedError

class NAIPProvider(BaseProvider):
    name = "naip"; cost_per_request = 0.0
    def get_tile(self, lat, lng, zoom=19): return None  # TODO: implement

class MapboxProvider(BaseProvider):
    name = "mapbox"; cost_per_request = 0.005
    def __init__(self, api_key: str): self.api_key = api_key
    def get_tile(self, lat, lng, zoom=19): return ImageryResult(b"", {"provider": self.name, "zoom": zoom})

class GoogleStaticProvider(BaseProvider):
    name = "google_static"; cost_per_request = 0.005
    def __init__(self, api_key: str): self.api_key = api_key
    def get_tile(self, lat, lng, zoom=19): return ImageryResult(b"", {"provider": self.name, "zoom": zoom})

def fetch_lowest_cost(lat, lng, zoom, providers, budget_remaining: float):
    for p in providers:
        if p.cost_per_request > budget_remaining: continue
        res = p.get_tile(lat, lng, zoom)
        if res is not None: return res, p.cost_per_request
    return None, 0.0
