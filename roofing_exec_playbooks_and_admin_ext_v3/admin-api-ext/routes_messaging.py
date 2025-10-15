from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
import dns.resolver, dns.exception
import os, httpx

router = APIRouter(tags=["messaging"])

# In-memory config (replace with DB table later)
PROVIDERS: Dict[str, Dict[str, Any]] = {}

class Provider(BaseModel):
    name: str  # smtp|resend|sendgrid|mailgun|ses
    api_key: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None
    domain: Optional[str] = None

@router.get("/messaging/providers")
async def list_providers():
    return list(PROVIDERS.values())

@router.post("/messaging/providers")
async def upsert_provider(p: Provider):
    PROVIDERS[p.name] = p.dict()
    return {"ok": True}

class TestMsg(BaseModel):
    provider: str
    to_email: EmailStr
    subject: str = "Test from Admin"
    text: str = "This is a test."

@router.post("/messaging/providers/test")
async def test_send(t: TestMsg):
    cfg = PROVIDERS.get(t.provider)
    if not cfg:
        raise HTTPException(404, "provider not found")
    # stubbed: call the provider API or SMTP; return success quickly
    return {"ok": True, "provider": t.provider}

class DomainReq(BaseModel):
    domain: str
    dkim_selector: Optional[str] = "default"

def _txt(domain):
    try:
        return [r.to_text().strip('"') for r in dns.resolver.resolve(domain, "TXT")]
    except dns.exception.DNSException:
        return []

@router.post("/messaging/domain/verify")
async def domain_verify(req: DomainReq):
    domain = req.domain
    spf = _txt(domain)
    dmarc = _txt(f"_dmarc.{domain}")
    dkim = _txt(f"{req.dkim_selector}._domainkey.{domain}")
    return {
        "domain": domain,
        "spf": spf,
        "dmarc": dmarc,
        "dkim": dkim
    }

class DKIMGen(BaseModel):
    selector: str
    public_key_pem: str  # uploaded or generated elsewhere

@router.post("/messaging/dkim/generate")
async def dkim_generate(req: DKIMGen):
    name = f"{req.selector}._domainkey"
    return {"record_name": name, "record_type": "TXT", "value": f"v=DKIM1; k=rsa; p={req.public_key_pem}"}

class CFRecord(BaseModel):
    zone_id: str
    token: str
    type: str  # TXT|CNAME
    name: str
    content: str
    ttl: int = 120

@router.post("/cloudflare/dns/apply")
async def cloudflare_apply(rec: CFRecord):
    # minimal Cloudflare DNS create
    url = f"https://api.cloudflare.com/client/v4/zones/{rec.zone_id}/dns_records"
    headers = {"Authorization": f"Bearer {rec.token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(url, json={
            "type": rec.type, "name": rec.name, "content": rec.content, "ttl": rec.ttl
        }, headers=headers)
        return r.json()
