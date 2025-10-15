"""Aggregations powering the SaaS dashboard."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

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
    # Comprehensive home summary (PRD-08/PRD-15)
    # ------------------------------------------------------------------
    @staticmethod
    async def fetch_summary(lead_limit: int = 25) -> Dict[str, Any]:
        """Return aggregated dashboard metrics, KPIs, queues, and supporting data."""

        generated_at = datetime.utcnow()
        start_today = generated_at.replace(hour=0, minute=0, second=0, microsecond=0)
        seven_days_ago = generated_at - timedelta(days=7)
        thirty_days_ago = generated_at - timedelta(days=30)

        metrics = await DashboardService.fetch_overview()
        clusters = await DashboardService.fetch_active_clusters(limit=lead_limit)

        usage_summary: Dict[str, Dict[str, float]] = {}
        errors_24h: List[Dict[str, Any]] = []
        tasks: List[Dict[str, Any]] = []
        roi_spend = 0.0
        pipeline_value = 0.0
        closed_value = 0.0
        roi_pct: Optional[float] = None
        kpis: Dict[str, Dict[str, Any]] = {}
        funnel: List[Dict[str, Any]] = []
        lead_queue: Dict[str, Dict[str, Any]] = {}

        db = await get_db()
        try:
            kpi_counts = await db.fetch_one(
                sa.text(
                    """
                    SELECT
                        SUM(CASE WHEN lead_score >= 85 AND created_at >= :start_today THEN 1 ELSE 0 END) AS hot_today,
                        SUM(CASE WHEN lead_score BETWEEN 60 AND 84.999 AND created_at >= :start_today THEN 1 ELSE 0 END) AS warm_today,
                        SUM(CASE WHEN status = 'appointment_scheduled' AND updated_at >= :seven_days_ago THEN 1 ELSE 0 END) AS appointments_week
                    FROM leads
                    """
                ),
                {"start_today": start_today, "seven_days_ago": seven_days_ago},
            ) or {}

            reports_stats = {}
            try:
                reports_stats = await db.fetch_one(
                    sa.text(
                        """
                        SELECT
                            SUM(CASE WHEN sent_at IS NOT NULL AND sent_at >= :seven_days_ago THEN 1 ELSE 0 END) AS sent_week,
                            SUM(CASE WHEN viewed_at IS NOT NULL AND viewed_at >= :seven_days_ago THEN 1 ELSE 0 END) AS viewed_week
                        FROM reports
                        """
                    ),
                    {"seven_days_ago": seven_days_ago},
                ) or {}
            except Exception:
                reports_stats = {"sent_week": 0, "viewed_week": 0}

            event_stats = {}
            try:
                event_stats = await db.fetch_one(
                    sa.text(
                        """
                        SELECT
                            SUM(CASE WHEN type = 'report.viewed' AND created_at >= :seven_days_ago THEN 1 ELSE 0 END) AS report_views,
                            SUM(CASE WHEN type IN ('message.clicked','message.replied','message.opened') AND created_at >= :seven_days_ago THEN 1 ELSE 0 END) AS message_engagement
                        FROM events
                        """
                    ),
                    {"seven_days_ago": seven_days_ago},
                ) or {}
            except Exception:
                event_stats = {"report_views": 0, "message_engagement": 0}

            usage_rows: List[Dict[str, Any]] = []
            try:
                usage_rows = await db.fetch_all(
                    sa.text(
                        """
                        SELECT metric, COALESCE(SUM(quantity), 0) AS total_quantity, COALESCE(SUM(cost_usd), 0) AS total_cost
                        FROM billing_usage
                        WHERE day >= :seven_days_ago
                        GROUP BY metric
                        """
                    ),
                    {"seven_days_ago": seven_days_ago.date()},
                )
            except Exception:
                usage_rows = []

            usage_summary = {
                row["metric"]: {
                    "quantity": float(row.get("total_quantity") or 0),
                    "cost": float(row.get("total_cost") or 0),
                }
                for row in usage_rows
            }

            errors_rows: List[Dict[str, Any]] = []
            try:
                errors_rows = await db.fetch_all(
                    sa.text(
                        """
                        SELECT type, COUNT(*) AS count, MAX(created_at) AS last_seen
                        FROM events
                        WHERE type IN ('message.bounced','call.failed','report.failed')
                          AND created_at >= :one_day_ago
                        GROUP BY type
                        ORDER BY last_seen DESC
                        LIMIT 10
                        """
                    ),
                    {"one_day_ago": generated_at - timedelta(hours=24)},
                )
            except Exception:
                errors_rows = []

            errors_24h = [
                {
                    "type": row.get("type"),
                    "count": int(row.get("count") or 0),
                    "last_seen": _iso(row.get("last_seen")),
                }
                for row in errors_rows
            ]

            tasks_rows: List[Dict[str, Any]] = []
            try:
                tasks_rows = await db.fetch_all(
                    sa.text(
                        """
                        SELECT id, lead_id, task_type, scheduled_for, created_at, completed_at
                        FROM follow_up_tasks
                        WHERE completed_at IS NULL
                        ORDER BY scheduled_for IS NULL, scheduled_for, created_at
                        LIMIT 20
                        """
                    )
                )
            except Exception:
                tasks_rows = []

            tasks = [
                {
                    "id": str(row.get("id")),
                    "lead_id": row.get("lead_id"),
                    "task_type": row.get("task_type"),
                    "scheduled_for": _iso(row.get("scheduled_for")),
                    "created_at": _iso(row.get("created_at")),
                }
                for row in tasks_rows
            ]

            roi_usage = await db.fetch_one(
                sa.text(
                    """
                    SELECT COALESCE(SUM(cost_usd), 0) AS spend
                    FROM billing_usage
                    WHERE day >= :thirty_days_ago
                    """
                ),
                {"thirty_days_ago": thirty_days_ago.date()},
            )
            if roi_usage:
                roi_spend = float(roi_usage.get("spend") or 0)

            pipeline_stats = await db.fetch_one(
                sa.text(
                    """
                    SELECT
                        SUM(CASE WHEN status != 'closed_lost' THEN COALESCE(estimated_value, 0) ELSE 0 END) AS pipeline_value,
                        SUM(CASE WHEN status = 'closed_won' THEN COALESCE(estimated_value, 0) ELSE 0 END) AS closed_value
                    FROM leads
                    """
                )
            ) or {}
            pipeline_value = float(pipeline_stats.get("pipeline_value") or 0.0)
            closed_value = float(pipeline_stats.get("closed_value") or 0.0)
            roi_pct = ((pipeline_value / roi_spend) - 1.0) * 100 if roi_spend > 0 else None

            kpis = {
                "hot_leads_today": {
                    "label": "Hot Leads (Today)",
                    "value": int(kpi_counts.get("hot_today") or 0),
                    "period": "24h",
                },
                "warm_leads_today": {
                    "label": "Warm Leads (Today)",
                    "value": int(kpi_counts.get("warm_today") or 0),
                    "period": "24h",
                },
                "reports_sent_7d": {
                    "label": "Reports Sent", "value": int(reports_stats.get("sent_week") or 0), "period": "7d"
                },
                "views_7d": {
                    "label": "Report Views", "value": int(event_stats.get("report_views") or reports_stats.get("viewed_week") or 0), "period": "7d"
                },
                "replies_7d": {
                    "label": "Replies / Clicks", "value": int(event_stats.get("message_engagement") or 0), "period": "7d"
                },
                "appointments_7d": {
                    "label": "Appointments",
                    "value": int(kpi_counts.get("appointments_week") or 0),
                    "period": "7d",
                },
            }

            funnel = [
                {"stage": "Reports Sent", "count": int(reports_stats.get("sent_week") or 0)},
                {"stage": "Viewed", "count": int(event_stats.get("report_views") or reports_stats.get("viewed_week") or 0)},
                {"stage": "Replied/Clicked", "count": int(event_stats.get("message_engagement") or 0)},
                {"stage": "Appointments", "count": int(kpi_counts.get("appointments_week") or 0)},
            ]

            def _format_lead(row: Dict[str, Any]) -> Dict[str, Any]:
                damage = row.get("damage_indicators") or []
                if isinstance(damage, str):
                    damage = [damage]
                if not isinstance(damage, list):
                    damage = list(damage) if damage else []

                contacts: List[str] = []
                if row.get("homeowner_phone"):
                    contacts.append("phone")
                if row.get("homeowner_email"):
                    contacts.append("email")

                status = (row.get("status") or "").lower()
                next_step_map = {
                    "new": "Call now",
                    "contacted": "Schedule follow-up",
                    "qualified": "Send proposal",
                    "proposal_sent": "Follow-up",
                    "appointment_scheduled": "Prep crew",
                    "closed_won": "Onboard",
                    "closed_lost": "Archive",
                }
                next_step = next_step_map.get(status, "Review")

                priority_value = row.get("priority")
                priority_label = str(priority_value) if priority_value is not None else None
                if hasattr(priority_value, "value"):
                    priority_label = priority_value.value

                return {
                    "id": str(row.get("id")),
                    "name": row.get("homeowner_name") or row.get("address"),
                    "address": row.get("address"),
                    "city": row.get("city"),
                    "state": row.get("state"),
                    "zip": row.get("zip_code"),
                    "lead_score": float(row.get("lead_score") or 0),
                    "priority": priority_label,
                    "contacts": contacts,
                    "homeowner_phone": row.get("homeowner_phone"),
                    "homeowner_email": row.get("homeowner_email"),
                    "roof_age_years": row.get("roof_age_years"),
                    "confidence": row.get("conversion_probability"),
                    "reason_codes": damage,
                    "last_activity": _iso(row.get("last_contacted") or row.get("updated_at") or row.get("created_at")),
                    "next_step": next_step,
                    "status": status,
                    "replacement_urgency": row.get("replacement_urgency"),
                    "estimated_value": float(row.get("estimated_value") or 0),
                }

            async def load_bucket(where_clause: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
                rows = await db.fetch_all(
                    sa.text(
                        f"""
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
                            priority,
                            status,
                            replacement_urgency,
                            damage_indicators,
                            last_contacted,
                            created_at,
                            updated_at,
                            roof_age_years,
                            conversion_probability,
                            estimated_value
                        FROM leads
                        WHERE {where_clause}
                        ORDER BY lead_score DESC, COALESCE(updated_at, created_at) DESC
                        LIMIT :limit
                        """
                    ),
                    {**params, "limit": lead_limit},
                )
                return [_format_lead(row) for row in rows]

            lead_queue["hot"] = {
                "label": "HOT",
                "leads": await load_bucket("lead_score >= 85", {}),
            }
            lead_queue["warm"] = {
                "label": "WARM",
                "leads": await load_bucket("lead_score BETWEEN 70 AND 84.999", {}),
            }
            lead_queue["followups"] = {
                "label": "Follow-ups",
                "leads": await load_bucket(
                    "status IN ('contacted','qualified','proposal_sent')",
                    {},
                ),
            }
            lead_queue["unreached"] = {
                "label": "Unreached",
                "leads": await load_bucket("last_contacted IS NULL", {}),
            }
            lead_queue["dnc"] = {
                "label": "DNC",
                "leads": await load_bucket("voice_opt_out = :dnc", {"dnc": True}),
            }

        finally:
            await db.close()

        roi = {
            "spend_last_30": roi_spend,
            "pipeline_value": pipeline_value,
            "closed_value": closed_value,
            "roi_percent": roi_pct,
        }

        summary = {
            "generated_at": generated_at.isoformat(),
            "metrics": metrics,
            "kpis": kpis,
            "lead_queue": lead_queue,
            "funnel": funnel,
            "usage": usage_summary,
            "errors_24h": errors_24h,
            "tasks": tasks,
            "roi": roi,
            "clusters": clusters,
        }

        return summary

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

    # ------------------------------------------------------------------
    # Event feed (PRD-08)
    # ------------------------------------------------------------------
    @staticmethod
    async def fetch_recent_events(limit: int = 50) -> List[Dict[str, Any]]:
        db = await get_db()
        try:
            rows = await db.fetch_all(
                sa.text(
                    """
                    SELECT id, type, source_service, lead_id, report_id, call_id, payload, created_at
                    FROM events
                    ORDER BY created_at DESC
                    LIMIT :limit
                    """
                ),
                {"limit": limit},
            )

            events: List[Dict[str, Any]] = []
            for row in rows:
                payload = row.get("payload") or {}
                if isinstance(payload, str):
                    try:
                        payload = json.loads(payload)
                    except Exception:
                        payload = {"raw": payload}

                events.append(
                    {
                        "id": str(row.get("id")),
                        "type": row.get("type"),
                        "source": row.get("source_service"),
                        "lead_id": row.get("lead_id"),
                        "report_id": row.get("report_id"),
                        "call_id": row.get("call_id"),
                        "payload": payload,
                        "occurred_at": _iso(row.get("created_at")),
                    }
                )

            return events
        finally:
            await db.close()
