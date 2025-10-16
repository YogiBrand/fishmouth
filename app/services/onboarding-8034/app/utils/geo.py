from typing import List, Tuple


def bbox_from_polygon(polygon: List[Tuple[float, float]]) -> Tuple[float, float, float, float]:
    lats = [lat for lat, lon in polygon]
    lons = [lon for lat, lon in polygon]
    return min(lats), min(lons), max(lats), max(lons)


def point_in_polygon(lat: float, lon: float, polygon: List[Tuple[float, float]]) -> bool:
    # Ray casting algorithm for point-in-polygon
    inside = False
    n = len(polygon)
    if n < 3:
        return False
    for i in range(n):
        j = (i - 1) % n
        yi, xi = polygon[i]
        yj, xj = polygon[j]
        intersect = ((xi > lon) != (xj > lon)) and (
            lat < (yj - yi) * (lon - xi) / (xj - xi + 1e-12) + yi
        )
        if intersect:
            inside = not inside
    return inside


def cluster_points(points: List[Tuple[float, float]], epsilon_m: float = 150.0) -> List[dict]:
    # Simple grid-based clustering by epsilon threshold (naive O(n^2))
    def haversine(a: Tuple[float, float], b: Tuple[float, float]) -> float:
        from math import radians, cos, sin, asin, sqrt

        lat1, lon1 = a
        lat2, lon2 = b
        R = 6371000.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        aa = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(aa))
        return R * c

    clusters: List[List[Tuple[float, float]]] = []
    for p in points:
        placed = False
        for cl in clusters:
            # Compare to cluster centroid
            cy = sum(pt[0] for pt in cl) / len(cl)
            cx = sum(pt[1] for pt in cl) / len(cl)
            if haversine(p, (cy, cx)) <= epsilon_m:
                cl.append(p)
                placed = True
                break
        if not placed:
            clusters.append([p])

    results: List[dict] = []
    for cl in clusters:
        cy = sum(pt[0] for pt in cl) / len(cl)
        cx = sum(pt[1] for pt in cl) / len(cl)
        results.append({"center": {"lat": cy, "lon": cx}, "count": len(cl)})
    results.sort(key=lambda x: x["count"], reverse=True)
    return results


