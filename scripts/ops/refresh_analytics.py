#!/usr/bin/env python3
"""
Refresh analytics materialized views in the shared Postgres database.

Usage:
    python scripts/ops/refresh_analytics.py [--database-url postgres://...]

If --database-url is omitted the script uses the DATABASE_URL environment variable.
"""

from __future__ import annotations

import argparse
import asyncio
import os
from typing import Iterable

import asyncpg

DEFAULT_VIEWS = (
    "analytics.kpi_daily",
    "analytics.api_usage_daily",
    "analytics.costs_daily",
    "analytics.margin_daily",
)


async def refresh_views(database_url: str, views: Iterable[str]) -> None:
    conn = await asyncpg.connect(database_url)
    try:
        for view in views:
            stmt = f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view};"
            try:
                await conn.execute(stmt)
                print(f"Refreshed {view}")
            except asyncpg.PostgresError as exc:
                print(f"Failed to refresh {view}: {exc}")
                raise
    finally:
        await conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh analytics materialized views.")
    parser.add_argument(
        "--database-url",
        dest="database_url",
        default=os.getenv("DATABASE_URL"),
        help="Postgres connection string (defaults to DATABASE_URL env var).",
    )
    parser.add_argument(
        "--views",
        nargs="*",
        default=DEFAULT_VIEWS,
        help="Specific materialized views to refresh.",
    )
    args = parser.parse_args()

    if not args.database_url:
        parser.error("DATABASE_URL is required (either via flag or environment variable).")

    asyncio.run(refresh_views(args.database_url, args.views))


if __name__ == "__main__":
    main()
