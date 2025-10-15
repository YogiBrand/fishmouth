"""Async-friendly helpers that wrap the legacy SQLAlchemy session usage."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping, Optional, Tuple, Union

from sqlalchemy import text
from sqlalchemy.engine import Result
from sqlalchemy.sql import Executable

from database import SessionLocal


QueryType = Union[str, Executable]
ParamsType = Optional[Mapping[str, Any]]


class DatabaseSession:
    """Lightweight async wrapper around the synchronous SQLAlchemy session."""

    def __init__(self) -> None:
        self._session = SessionLocal()
        self._closed = False

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    def _prepare(self, query: QueryType, params: ParamsType) -> Tuple[Executable, Dict[str, Any]]:
        if isinstance(query, str):
            stmt: Executable = text(query)
        else:
            stmt = query

        bound_params: Dict[str, Any] = dict(params or {})
        return stmt, bound_params

    def _as_mapping(self, result: Result) -> Optional[Dict[str, Any]]:
        row = result.mappings().first()
        return dict(row) if row is not None else None

    # ------------------------------------------------------------------ #
    # Async-style public API (mirrors databases.Database)
    # ------------------------------------------------------------------ #
    async def fetch_one(self, query: QueryType, params: ParamsType = None) -> Optional[Dict[str, Any]]:
        stmt, bound = self._prepare(query, params)
        result = self._session.execute(stmt, bound)
        return self._as_mapping(result)

    async def fetch_all(self, query: QueryType, params: ParamsType = None) -> List[Dict[str, Any]]:
        stmt, bound = self._prepare(query, params)
        result = self._session.execute(stmt, bound)
        return [dict(row) for row in result.mappings().all()]

    async def fetch_val(self, query: QueryType, params: ParamsType = None) -> Any:
        stmt, bound = self._prepare(query, params)
        result = self._session.execute(stmt, bound)
        row = result.first()
        if row is None:
            return None
        if hasattr(row, "_mapping"):
            return next(iter(row._mapping.values()))
        if isinstance(row, Iterable):
            return next(iter(row))
        return row

    async def execute(self, query: QueryType, params: ParamsType = None) -> Result:
        stmt, bound = self._prepare(query, params)
        result = self._session.execute(stmt, bound)
        return result

    async def commit(self) -> None:
        self._session.commit()

    async def rollback(self) -> None:
        self._session.rollback()

    async def close(self) -> None:
        if not self._closed:
            self._session.close()
            self._closed = True

    # ------------------------------------------------------------------ #
    # Context manager support
    # ------------------------------------------------------------------ #
    async def __aenter__(self) -> "DatabaseSession":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
        if exc:
            self._session.rollback()
        else:
            self._session.commit()
        self._session.close()
        self._closed = True

    # Convenience property for advanced integrations
    @property
    def session(self):
        return self._session

    def __del__(self) -> None:
        try:
            if not self._closed:
                self._session.close()
        except Exception:
            # Avoid noisy errors during interpreter shutdown
            pass


async def get_db() -> DatabaseSession:
    """Replicate the async database accessor pattern used throughout the spec."""

    return DatabaseSession()
