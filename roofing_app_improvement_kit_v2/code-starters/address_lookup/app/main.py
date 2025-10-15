from fastapi import FastAPI
from pydantic import BaseModel
import uuid

app = FastAPI(title="Address Lookup (8022)")

class LookupIn(BaseModel):
    address: str
    include_imagery: bool = True
    include_permits: bool = True

jobs = {}

@app.get("/health")
def health(): return {"status":"ok"}

@app.post("/lookup")
def lookup(inp: LookupIn):
    jid = str(uuid.uuid4())
    jobs[jid] = {"status":"queued", "address": inp.address}
    # In production: call 8025→8024→8011→8004→8026→8008 asynchronously
    return {"job_id": jid, "status": "queued"}

@app.get("/lookup/{job_id}")
def check(job_id: str):
    return jobs.get(job_id, {"error":"not_found"})
