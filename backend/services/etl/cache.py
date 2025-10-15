"""Persistence-backed cache for enrichment calls."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from models import EnrichmentCache


class EnrichmentCacheRepository:
    """Simple TTL cache stored in the enrichment_cache table."""

    def __init__(self, session: Session, default_ttl_days: int = 7) -> None:
        self.session = session
        self.default_ttl = timedelta(days=default_ttl_days)

    def _is_expired(self, record: EnrichmentCache) -> bool:
        return record.expires_at < datetime.utcnow()

    def get(self, cache_type: str, cache_key: str) -> Optional[Dict[str, Any]]:
        record = (
            self.session.query(EnrichmentCache)
            .filter(EnrichmentCache.cache_type == cache_type, EnrichmentCache.cache_key == cache_key)
            .one_or_none()
        )
        if not record:
            return None
        if self._is_expired(record):
            self.session.delete(record)
            self.session.flush()
            return None
        return record.payload

    def set(
        self,
        cache_type: str,
        cache_key: str,
        payload: Dict[str, Any],
        ttl: Optional[timedelta] = None,
    ) -> None:
        ttl = ttl or self.default_ttl
        expires_at = datetime.utcnow() + ttl

        record = (
            self.session.query(EnrichmentCache)
            .filter(EnrichmentCache.cache_type == cache_type, EnrichmentCache.cache_key == cache_key)
            .one_or_none()
        )

        if record is None:
            record = EnrichmentCache(
                cache_key=cache_key,
                cache_type=cache_type,
                payload=payload,
                expires_at=expires_at,
            )
            self.session.add(record)
        else:
            record.payload = payload
            record.expires_at = expires_at
            record.updated_at = datetime.utcnow()

        self.session.flush()

