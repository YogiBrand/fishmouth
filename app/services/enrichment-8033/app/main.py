from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

try:
    from services.shared.telemetry_middleware import TelemetryMW
except Exception:
    TelemetryMW = None

from .scrapers.property_scraper import get_property_details
from .scrapers.contact_scraper import search_contact_by_address, search_contact_by_name
from .ai.ai_research_agent import query_openrouter, query_playwright

app = FastAPI(title="Enrichment/OSINT 8033")
if TelemetryMW:
    app.add_middleware(TelemetryMW)

class Address(BaseModel):
    address: str

class ReverseAddress(BaseModel):
    street: str
    city: str
    state: str

class NameQuery(BaseModel):
    name: str
    city: Optional[str] = None
    state: Optional[str] = None

class ResearchQuery(BaseModel):
    question: str
    use_openrouter: bool = True

@app.get("/health")
def health(): return {"status":"ok"}

@app.post("/property/details")
def property_details(a: Address):
    return get_property_details(a.address)

@app.post("/contact/lookup/address")
def contact_by_address(a: ReverseAddress):
    return search_contact_by_address(a.street, a.city, a.state)

@app.post("/contact/lookup/name")
def contact_by_name(n: NameQuery):
    return search_contact_by_name(n.name, n.city, n.state)

@app.post("/research/query")
async def research(q: ResearchQuery):
    if q.use_openrouter:
        return await query_openrouter(q.question)
    return await query_playwright(q.question)
