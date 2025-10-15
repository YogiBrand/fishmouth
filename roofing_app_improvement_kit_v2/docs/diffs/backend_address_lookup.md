# Backend Diff — Address Lookup

1) Add models:
```py
class LookupJob(BaseModel):
    id: str
    address: str
    status: str
    results: dict
```

2) Routes (FastAPI 8000):
```py
POST /api/lookup/address
GET /api/lookup/{job_id}
```

3) Implementation:
- On POST: normalize via 8025 `/geocode`, create `job:{id}` Redis hash, queue tasks:
  - imagery thumbnail via TiTiler (quick)
  - CV via 8024
  - permits via 8011
  - enrichment via 8004
  - quality via 8026
  - lead via 8008
- On GET: read Redis hash and return progressive payload.
- Expire jobs after 24h.
```