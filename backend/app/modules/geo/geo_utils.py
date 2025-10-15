from typing import List, Tuple
from shapely.geometry import shape, mapping, Polygon
from shapely.ops import unary_union

def merge_polygons(geojson: dict) -> Polygon:
    geoms = []
    if geojson.get('type') == 'FeatureCollection':
        for f in geojson['features']:
            geoms.append(shape(f['geometry']))
    elif geojson.get('type') == 'Feature':
        geoms.append(shape(geojson['geometry']))
    else:
        geoms.append(shape(geojson))
    return unary_union(geoms)

def polygon_bounds(poly: Polygon) -> Tuple[float,float,float,float]:
    minx, miny, maxx, maxy = poly.bounds
    return (minx, miny, maxx, maxy)
