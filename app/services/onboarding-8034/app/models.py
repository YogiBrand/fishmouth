from pydantic import BaseModel
from typing import Optional, List, Tuple

class SeedRequest(BaseModel):
    user_id: str
    lat: float
    lon: float
    radius_m: int = 5000
    sample: int = 1000

class PolygonSeedRequest(SeedRequest):
    polygon: List[Tuple[float, float]]

class RedeemRequest(BaseModel):
    user_id: str
    lead_id: int
    cost_credits: int = 10

class Lead(BaseModel):
    id: int
    lat: float
    lon: float
    score: float
    status: str
    locked: bool
    expected_revenue: float
    preview: Optional[dict] = None

class LeadList(BaseModel):
    hot: List[Lead]
    warm: List[Lead]
    locked: List[Lead]
