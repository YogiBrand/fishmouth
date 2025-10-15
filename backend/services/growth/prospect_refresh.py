"""Prospect ingestion for the contractor growth module."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional

from sqlalchemy import func

from database import SessionLocal
from models import ContractorProspect


@dataclass(frozen=True)
class ProspectRecord:
    company_name: str
    contact_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    website: Optional[str]
    address: Optional[str]
    city: str
    state: str
    postal_code: Optional[str]
    source: str
    score: float
    tags: List[str]
    metadata: Dict[str, object]


_ADJECTIVES = [
    "Summit",
    "Pinnacle",
    "Guardian",
    "Titan",
    "Legacy",
    "Heritage",
    "Granite",
    "Atlas",
    "Frontier",
    "North Star",
]

_SPECIALTIES = [
    "Roofing",
    "Exterior",
    "Restoration",
    "Construction",
    "Storm Response",
]

_CONTACT_NAMES = [
    "Alex Ramirez",
    "Jordan Blake",
    "Morgan Ellis",
    "Taylor Chen",
    "Casey Harper",
    "Devin Clarke",
    "Riley Morgan",
    "Sydney Patel",
    "Quinn Lawson",
    "Hayden Brooks",
]

_CITY_MARKETS = [
    ("Dallas", "TX", "75201"),
    ("Austin", "TX", "73301"),
    ("San Antonio", "TX", "78205"),
    ("Houston", "TX", "77002"),
    ("Phoenix", "AZ", "85001"),
    ("Mesa", "AZ", "85201"),
    ("Atlanta", "GA", "30303"),
    ("Charlotte", "NC", "28202"),
    ("Raleigh", "NC", "27601"),
    ("Orlando", "FL", "32801"),
    ("Tampa", "FL", "33602"),
    ("Nashville", "TN", "37203"),
    ("Denver", "CO", "80202"),
    ("Colorado Springs", "CO", "80903"),
]

_SOURCES = [
    "state-license",
    "directory-angis",
    "directory-thumbtack",
    "trade-association",
]


def _slugify(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")


def load_prospect_sources() -> List[ProspectRecord]:
    """Generate deterministic prospect records for the growth module."""

    records: List[ProspectRecord] = []
    idx = 0
    for city, state, postal in _CITY_MARKETS:
        for flavor in range(5):
            adjective = _ADJECTIVES[(idx + flavor) % len(_ADJECTIVES)]
            specialty = _SPECIALTIES[(idx + flavor) % len(_SPECIALTIES)]
            company_name = f"{adjective} {specialty} {city}"
            contact = _CONTACT_NAMES[(idx + flavor) % len(_CONTACT_NAMES)]
            email_slug = _slugify(company_name.split()[0])
            email = f"{email_slug}@{_slugify(city)}roofpros.com"
            phone = f"+1-555-{(idx + flavor + 1000):04d}"
            website = f"https://{_slugify(adjective)}{_slugify(specialty)}{_slugify(city)}.com"
            source = _SOURCES[(idx + flavor) % len(_SOURCES)]
            score = 70 + ((idx + flavor) % 30)
            tags = ["residential", "hail", state.lower()]
            metadata = {
                "years_in_business": 5 + ((idx + flavor) % 12),
                "license_verified": True,
                "employees": 8 + ((idx + flavor) % 10),
            }
            records.append(
                ProspectRecord(
                    company_name=company_name,
                    contact_name=contact,
                    email=email,
                    phone=phone,
                    website=website,
                    address=f"{100 + flavor * 5} Main St",
                    city=city,
                    state=state,
                    postal_code=postal,
                    source=source,
                    score=float(score),
                    tags=tags,
                    metadata=metadata,
                )
            )
        idx += 1

    return records


def _identity_hash(record: ProspectRecord) -> str:
    basis = "|".join(
        (
            record.company_name.lower().strip(),
            (record.phone or "").replace("+", "").replace("-", ""),
            record.city.lower(),
            record.state.lower(),
        )
    )
    return hashlib.sha1(basis.encode("utf-8")).hexdigest()


def refresh_contractor_prospects(
    *,
    records: Optional[Iterable[ProspectRecord]] = None,
    min_score: float = 65.0,
) -> Dict[str, int]:
    """Upsert contractor prospects from polite sources.

    Returns a summary dict with counts of new, updated, and skipped prospects.
    """

    session = SessionLocal()
    created = 0
    updated = 0
    skipped = 0
    now = datetime.utcnow()

    try:
        for record in records or load_prospect_sources():
            if record.score < min_score:
                skipped += 1
                continue

            identity = _identity_hash(record)
            prospect: Optional[ContractorProspect] = (
                session.query(ContractorProspect)
                .filter(ContractorProspect.identity_hash == identity)
                .one_or_none()
            )

            if prospect is None:
                prospect = ContractorProspect(
                    company_name=record.company_name,
                    contact_name=record.contact_name,
                    email=record.email,
                    phone=record.phone,
                    website=record.website,
                    address=record.address,
                    city=record.city,
                    state=record.state,
                    postal_code=record.postal_code,
                    source=record.source,
                    identity_hash=identity,
                    score=record.score,
                    tags={"labels": record.tags},
                    enriched=record.metadata,
                    metadata={"source": record.source},
                    status="new",
                    first_seen=now,
                    last_seen=now,
                )
                session.add(prospect)
                created += 1
            else:
                prospect.company_name = record.company_name
                prospect.contact_name = record.contact_name
                prospect.email = record.email
                prospect.phone = record.phone
                prospect.website = record.website
                prospect.address = record.address
                prospect.city = record.city
                prospect.state = record.state
                prospect.postal_code = record.postal_code
                prospect.source = record.source
                prospect.score = record.score
                prospect.tags = {"labels": record.tags}
                prospect.enriched = record.metadata
                prospect.metadata = {**(prospect.metadata or {}), "source": record.source}
                prospect.last_seen = now
                if prospect.status == "archived" and record.score >= min_score:
                    prospect.status = "new"
                updated += 1

        session.commit()
        return {"created": created, "updated": updated, "skipped": skipped}
    finally:
        session.close()


def prune_stale_prospects(days: int = 60) -> int:
    """Archive prospects that have not been seen recently."""

    session = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=days)
        affected = (
            session.query(ContractorProspect)
            .filter(ContractorProspect.last_seen < cutoff)
            .filter(ContractorProspect.status == "new")
            .update({"status": "archived"}, synchronize_session=False)
        )
        session.commit()
        return affected
    finally:
        session.close()


def count_active_prospects(session=None) -> int:
    """Return number of active prospects with score >= 70."""

    owns_session = session is None
    session = session or SessionLocal()
    try:
        return (
            session.query(func.count(ContractorProspect.id))
            .filter(ContractorProspect.score >= 70)
            .scalar()
        )
    finally:
        if owns_session:
            session.close()
