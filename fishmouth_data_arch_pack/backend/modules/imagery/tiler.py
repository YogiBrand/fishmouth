import math

def latlng_to_tile(lat: float, lng: float, zoom: int):
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    xtile = int((lng + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    return xtile, ytile

def tile_bounds(x: int, y: int, z: int):
    n = 2.0 ** z
    lon_deg1 = x / n * 360.0 - 180.0
    lat_rad1 = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    lat_deg1 = math.degrees(lat_rad1)
    lon_deg2 = (x + 1) / n * 360.0 - 180.0
    lat_rad2 = math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n)))
    lat_deg2 = math.degrees(lat_rad2)
    return (lon_deg1, lat_deg2, lon_deg2, lat_deg1)  # (west,south,east,north)
