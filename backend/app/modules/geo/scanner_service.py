from typing import Dict, Any, List, Tuple
from shapely.geometry import Polygon
from .geo_utils import polygon_bounds
from ..imagery.tiler import latlng_to_tile
import math

def cover_polygon_with_tiles(area: Polygon, zoom: int = 18, max_tiles: int = 10000) -> List[Tuple[int,int,int]]:
    minx, miny, maxx, maxy = polygon_bounds(area)
    # naive tile cover (fast and adequate for moderate areas)
    x1, y1 = latlng_to_tile(miny, minx, zoom)
    x2, y2 = latlng_to_tile(maxy, maxx, zoom)
    tiles = []
    for x in range(min(x1,x2), max(x1,x2)+1):
        for y in range(min(y1,y2), max(y1,y2)+1):
            tiles.append((x,y,zoom))
            if len(tiles) > max_tiles:
                return tiles
    return tiles
