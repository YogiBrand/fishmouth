import httpx, math

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def bbox_from_center(lat, lon, radius_m=5000):
    dlat = (radius_m/111320.0)
    dlon = (radius_m/(40075000.0 * (math.cos(math.radians(lat)))/360.0))
    return lat-dlat, lon-dlon, lat+dlat, lon+dlon

async def fetch_buildings(lat, lon, radius_m=5000, limit=1200):
    south, west, north, east = bbox_from_center(lat, lon, radius_m)
    q = f"""[out:json][timeout:60];
(
  way["building"]({south},{west},{north},{east});
  node["building"]({south},{west},{north},{east});
);
out center {limit};
"""
    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post(OVERPASS_URL, data={"data": q})
        r.raise_for_status()
        data = r.json()
    pts = []
    for el in data.get("elements", []):
        if el.get("type") == "node":
            pts.append((el["lat"], el["lon"]))
        elif el.get("type") == "way" and "center" in el:
            pts.append((el["center"]["lat"], el["center"]["lon"]))
        if len(pts) >= limit:
            break
    return pts
