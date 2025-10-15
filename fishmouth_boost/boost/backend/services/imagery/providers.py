from typing import Optional, Tuple

class ImageryProviderBase:
    name = "base"
    cost = 0.0
    def get_image(self, lat: float, lng: float, zoom: int = 19) -> Optional[bytes]:
        raise NotImplementedError

class FreeProvider(ImageryProviderBase):
    name = "free-naip"
    cost = 0.0
    def get_image(self, lat: float, lng: float, zoom: int = 19) -> Optional[bytes]:
        # Placeholder: return None to simulate missing tiles
        return None

class MapboxProvider(ImageryProviderBase):
    name = "mapbox"
    cost = 0.005
    def get_image(self, lat: float, lng: float, zoom: int = 19) -> Optional[bytes]:
        # TODO: implement HTTP call with MAPBOX token
        return None

class GoogleStaticProvider(ImageryProviderBase):
    name = "google-static"
    cost = 0.005
    def get_image(self, lat: float, lng: float, zoom: int = 19) -> Optional[bytes]:
        # TODO: implement HTTP call with Google Maps Static
        return None

def lowest_cost_chain():
    return [FreeProvider(), MapboxProvider(), GoogleStaticProvider()]
