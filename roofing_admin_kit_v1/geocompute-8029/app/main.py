
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="GeoCompute 8029")

class ZonalRequest(BaseModel):
    raster_uri: str
    polygons: List[List[List[float]]]

@app.get("/health")
def health():
    return {"status":"ok"}

@app.post("/zonal/mean")
def zonal_mean(req: ZonalRequest):
    # TODO: integrate rasterio + shapely + rasterstats
    return {"means": [0.0 for _ in req.polygons]}

class AlgebraRequest(BaseModel):
    expr: str
    inputs: dict

@app.post("/raster/algebra")
def raster_algebra(req: AlgebraRequest):
    # TODO: parse expr and compute
    return {"ok": True, "expr": req.expr}
