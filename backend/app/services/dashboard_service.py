"""Aggregations powering the SaaS dashboard."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List, Optional

import sqlalchemy as sa

from app.core.database import get_db


def _iso(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


class DashboardService:
    """Analytics + aggregation helpers for the customer dashboard."""

    # ------------------------------------------------------------------
    # High-level overview
    # ------------------------------------------------------------------
    @staticmethod
    async def fetch_overview() -> Dict[str, object]:
        db = await get_db()
        try:
            snapshot = await db.fetch_one(
                sa.text(
                    """
                    SELECT
                        COUNT(*) AS total_leads,
                        COUNT(*) FILTER (WHERE lead_score >= 90) AS ultra_hot_leads,
                        COUNT(*) FILTER (WHERE status = 'appointment_scheduled') AS appointments_booked,
                        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_leads_last_week
                    FROM leads
                    """
                )
            ) or {}

            leads_over_time_rows = await db.fetch_all(
                sa.text(
                    """
                    SELECT
                        to_char(date_trunc('day', created_at), 'Mon DD') AS label,
                        COUNT(*) AS total
                    FROM leads
                    WHERE created_at >= NOW() - INTERVAL '30 days'
                    GROUP BY 1
                    ORDER BY date_trunc('day', created_at)
                    """
                )
            )
            leads_over_time = [{"date": row["label"], "leads": int(row["total"])} for row in leads_over_time_rows]

            qualified_count = await db.fetch_val(
                sa.text("SELECT COUNT(*) FROM leads WHERE lead_score >= 70")
            ) or 0
            appointments = int(snapshot.get("appointments_booked") or 0)
            total_leads = int(snapshot.get("total_leads") or 0)

            conversion_funnel = [
                {"stage": "Captured", "count": total_leads},
                {"stage": "Qualified", "count": qualified_count},
                {"stage": "Appointments", "count": appointments},
            ]
            conversion_rate = round((appointments / total_leads) * 100, 1) if total_leads else 0.0

            clusters = await DashboardService.fetch_active_clusters(limit=25)
            active_clusters = len(clusters)
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            new_clusters = sum(
                1
                for cluster in clusters
                if cluster.get("date_range_end")
                and datetime.fromisoformat(cluster["date_range_end"]) >= seven_days_ago
            )

            return {
                "total_leads": total_leads,
                "ultra_hot_leads": int(snapshot.get("ultra_hot_leads") or 0),
                "appointments_booked": appointments,
                "conversion_rate": conversion_rate,
                "active_clusters": active_clusters,
                "new_clusters": new_clusters,
                "leads_over_time": leads_over_time,
                "conversion_funnel": conversion_funnel,
            }
        finally:
            await db.close()

    # ------------------------------------------------------------------
    # Clusters + activity feed
    # ------------------------------------------------------------------
    @staticmethod
    async def fetch_active_clusters(limit: int = 25) -> List[Dict[str, object]]:
        db = await get_db()
        try:
            rows = await db.fetch_all(
                sa.text(
                    """
                    SELECT
                        LOWER(REPLACE(COALESCE(city, 'unknown') || '-' || COALESCE(state, 'na'), ' ', '-')) AS cluster_id,
                        COALESCE(city, 'Unknown') AS city,
                        COALESCE(state, 'NA') AS state,
                        COUNT(*) FILTER (WHERE lead_score >= 70) AS hot_leads,
                        COUNT(*) FILTER (WHERE lead_score >= 85) AS ultra_hot,
                        AVG(lead_score) AS avg_score,
                        MIN(created_at) AS first_seen,
                        MAX(created_at) AS last_seen
                    FROM leads
                    WHERE city IS NOT NULL AND state IS NOT NULL
                    GROUP BY city, state
                    HAVING COUNT(*) FILTER (WHERE lead_score >= 70) > 0
                    ORDER BY COUNT(*) FILTER (WHERE lead_score >= 70) DESC, AVG(lead_score) DESC
                    LIMIT :limit
                    """
                ),
                {"limit": limit},
            )

            clusters: List[Dict[str, object]] = []
            for row in rows:
                avg_score = float(row.get("avg_score") or 0)
                hot_count = int(row.get("hot_leads") or 0)
                ultra_hot = int(row.get("ultra_hot") or 0)

                if avg_score >= 88 and ultra_hot >= 5:
                    status = "hot"
                elif avg_score >= 78 and hot_count >= 3:
                    status = "active"
                else:
                    status = "warming"

                clusters.append(
                    {
                        "id": row.get("cluster_id"),
                        "city": row.get("city"),
                        "state": row.get("state"),
                        "permit_count": hot_count,
                        "ultra_hot": ultra_hot,
                        "avg_score": round(avg_score, 1),
                        "cluster_score": round(avg_score, 1),
                        "cluster_status": status,
                        "radius_miles": 0.5,
                        "date_range_start": _iso(row.get("first_seen")),
                        "date_range_end": _iso(row.get("last_seen")),
                        "metadata": {
                            "hot_leads": hot_count,
                            "ultra_hot_leads": ultra_hot,
                        },
                    }
                )
            return clusters
        finally:
            await db.close()

    @staticmethod
    async def fetch_recent_activity(limit: int = 15) -> List[Dict[str, object]]:
        db = await get_db()
        try:
            rows = await db.fetch_all(
                sa.text(
                    """
                    SELECT
                        la.id,
                        la.activity_type,
                        la.title,
                        la.description,
                        la.created_at,
                        l.id AS lead_id,
                        l.homeowner_name,
                        l.address
                    FROM lead_activities la
                    JOIN leads l ON la.lead_id = l.id
                    ORDER BY la.created_at DESC
                    LIMIT :limit
                    """
                ),
                {"limit": limit},
            )

            return [
                {
                    "id": row["id"],
                    "type": row["activity_type"],
                    "message": row["description"] or row["title"],
                    "payload": {
                        "lead_id": row["lead_id"],
                        "lead_name": row["homeowner_name"] or row["address"],
                        "timestamp": _iso(row["created_at"]),
                    },
                    "occurred_at": _iso(row["created_at"]),
                }
                for row in rows
            ]
        finally:
            await db.close()

    # ------------------------------------------------------------------
    # Lead snapshots
    # ------------------------------------------------------------------
    @staticmethod
    async def fetch_hot_leads(min_score: int = 75, limit: int = 50) -> List[Dict[str, object]]:
        db = await get_db()
        try:
            rows = await db.fetch_all(
                sa.text(
                    """
                    SELECT
                        id,
                        homeowner_name,
                        homeowner_phone,
                        homeowner_email,
                        address,
                        city,
                        state,
                        zip_code,
                        lead_score,
                        replacement_urgency,
                        damage_indicators,
                        last_contacted,
                        created_at,
                        quality_validation_status,
                        image_quality_score,
                        estimated_value,
                        discovery_status,
                        ai_analysis,
                        roof_intelligence,
                        street_view_quality
                    FROM leads
                    WHERE lead_score >= :min_score
                    ORDER BY lead_score DESC, created_at DESC
                    LIMIT :limit
                    """
                ),
                {"min_score": min_score, "limit": limit},
            )

            enriched: List[Dict[str, object]] = []
            for row in rows:
                enriched.append(
                    {
                        "id": row["id"],
                        "name": row["homeowner_name"] or row["address"],
                        "address": f"{row['address']}, {row['city']}, {row['state']} {row.get('zip_code') or ''}".strip(),
                        "phone": row["homeowner_phone"],
                        "email": row["homeowner_email"],
                        "score": float(row["lead_score"] or 0),
                        "lead_source": row.get("discovery_status"),
                        "status": row.get("replacement_urgency"),
                        "damage_indicators": row.get("damage_indicators") or [],
                        "image_quality_score": row.get("image_quality_score"),
                        "quality_validation_status": row.get("quality_validation_status"),
                        "roof_intelligence": row.get("roof_intelligence"),
                        "street_view_quality": row.get("street_view_quality"),
                        "ai_analysis": row.get("ai_analysis"),
                        "damage_estimate": row.get("estimated_value"),
                        "last_contact": _iso(row.get("last_contacted")),
                        "created_at": _iso(row.get("created_at")),
                    }
                )
            return enriched
        finally:
            await db.close()
