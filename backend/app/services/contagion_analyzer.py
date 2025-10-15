"""Contagion analysis services for neighbourhood clustering and scoring."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert

from app.core.database import get_db
from app.models import ContagionCluster, PropertyScore
from services.ai.roof_intelligence import EnhancedRoofAnalysisPipeline
from services.providers.property_enrichment import PropertyProfile
from storage import save_overlay_png


logger = logging.getLogger(__name__)


class ContagionAnalyzerService:
    """Identify contagion clusters and score nearby properties."""

    @classmethod
    async def identify_clusters(
        cls,
        city: str,
        state: str,
        min_permits: int = 3,
        days_back: int = 90,
    ) -> List[Dict[str, object]]:
        db = await get_db()
        try:
            date_threshold = datetime.utcnow() - timedelta(days=days_back)
            query = sa.text(
                """
                WITH permit_clusters AS (
                    SELECT
                        id,
                        address,
                        city,
                        state,
                        permit_date,
                        permit_value,
                        subdivision_name,
                        latitude,
                        longitude,
                        ST_ClusterDBSCAN(
                            COALESCE(geom, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography)::geometry,
                            eps := 0.0045,
                            minpoints := :min_permits
                        ) OVER () AS cluster_id
                    FROM building_permits
                    WHERE city = :city
                      AND state = :state
                      AND permit_date >= :date_threshold
                      AND latitude IS NOT NULL
                      AND longitude IS NOT NULL
                )
                SELECT
                    cluster_id,
                    COUNT(*) AS permit_count,
                    AVG(permit_value) AS avg_permit_value,
                    ST_Y(ST_Centroid(ST_Collect(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geometry)))::numeric(10,8) AS center_lat,
                    ST_X(ST_Centroid(ST_Collect(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geometry)))::numeric(11,8) AS center_lng,
                    ARRAY_AGG(DISTINCT subdivision_name) FILTER (WHERE subdivision_name IS NOT NULL) AS subdivisions,
                    ARRAY_AGG(address ORDER BY permit_date DESC) AS addresses,
                    MIN(permit_date) AS earliest_permit,
                    MAX(permit_date) AS latest_permit
                FROM permit_clusters
                WHERE cluster_id IS NOT NULL
                GROUP BY cluster_id
                HAVING COUNT(*) >= :min_permits
                ORDER BY COUNT(*) DESC, MAX(permit_date) DESC
                """
            )

            rows = await db.fetch_all(
                query,
                {
                    "city": city,
                    "state": state,
                    "min_permits": min_permits,
                    "date_threshold": date_threshold,
                },
            )

            clusters: List[Dict[str, object]] = []
            for row in rows:
                days_active = (row["latest_permit"] - row["earliest_permit"]).days or 1
                cluster_score = cls._calculate_cluster_score(
                    permit_count=row["permit_count"],
                    days_active=days_active,
                    avg_value=row["avg_permit_value"] or 0,
                )
                cluster_data = {
                    "city": city,
                    "state": state,
                    "center_latitude": row["center_lat"],
                    "center_longitude": row["center_lng"],
                    "radius_miles": 0.25,
                    "permit_count": row["permit_count"],
                    "avg_permit_value": row["avg_permit_value"],
                    "date_range_start": row["earliest_permit"],
                    "date_range_end": row["latest_permit"],
                    "subdivision_name": (row["subdivisions"] or [None])[0],
                    "cluster_score": cluster_score,
                    "cluster_status": cls._determine_cluster_status(row["permit_count"], days_active),
                    "metadata": {
                        "sample_addresses": (row["addresses"] or [])[:5],
                        "all_subdivisions": row["subdivisions"] or [],
                    },
                    "last_scored_at": datetime.utcnow(),
                }
                stmt = insert(ContagionCluster).values(cluster_data)
                do_update = stmt.on_conflict_do_update(
                    index_elements=[ContagionCluster.city, ContagionCluster.state, ContagionCluster.center_latitude, ContagionCluster.center_longitude],
                    set_={
                        "permit_count": cluster_data["permit_count"],
                        "avg_permit_value": cluster_data["avg_permit_value"],
                        "cluster_score": cluster_data["cluster_score"],
                        "cluster_status": cluster_data["cluster_status"],
                        "last_scored_at": cluster_data["last_scored_at"],
                        "metadata": cluster_data["metadata"],
                    },
                ).returning(ContagionCluster.id)
                result = await db.execute(do_update)
                mapping = result.mappings().first()
                cluster_id = mapping["id"] if mapping else await cls._fetch_cluster_id(db, cluster_data)

                if cluster_id:
                    await db.execute(
                        sa.text(
                            """
                            UPDATE contagion_clusters
                            SET cluster_center = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                            WHERE id = :cluster_id
                            """
                        ),
                        {
                            "lng": row["center_lng"],
                            "lat": row["center_lat"],
                            "cluster_id": cluster_id,
                        },
                    )

                cluster_data["id"] = cluster_id
                clusters.append(cluster_data)

            await db.commit()
            return clusters
        finally:
            await db.close()

    @classmethod
    async def score_cluster_properties(
        cls,
        cluster_id: str,
        max_properties: int = 1000,
    ) -> Dict[str, object]:
        db = await get_db()
        try:
            cluster = await db.fetch_one(
                sa.select(ContagionCluster).where(ContagionCluster.id == cluster_id)
            )
            if not cluster:
                raise ValueError(f"Cluster {cluster_id} not found")

            center_lat = cluster["center_latitude"]
            center_lng = cluster["center_longitude"]

            properties_query = sa.text(
                """
                SELECT *
                FROM properties
                WHERE latitude IS NOT NULL
                  AND longitude IS NOT NULL
                  AND city = :city
                  AND state = :state
                  AND ST_DWithin(
                        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                        402
                  )
                LIMIT :limit
                """
            )
            properties = await db.fetch_all(
                properties_query,
                {
                    "city": cluster["city"],
                    "state": cluster["state"],
                    "lat": center_lat,
                    "lng": center_lng,
                    "limit": max_properties,
                },
            )

            pipeline = EnhancedRoofAnalysisPipeline()
            scores: List[Dict[str, object]] = []
            try:
                for property_row in properties:
                    try:
                        score = await cls._calculate_property_score(db, property_row, cluster, pipeline)
                        scores.append(score)
                    except Exception as exc:  # noqa: BLE001
                        logger.exception("contagion.score_error", property_id=property_row["id"], error=str(exc))
                        continue
            finally:
                await pipeline.aclose()

            if scores:
                stmt = insert(PropertyScore).values(scores)
                stmt = stmt.on_conflict_do_update(
                    index_elements=[PropertyScore.property_id],
                    set_={
                        "contagion_score": stmt.excluded.contagion_score,
                        "age_match_score": stmt.excluded.age_match_score,
                        "financial_score": stmt.excluded.financial_score,
                        "visual_score": stmt.excluded.visual_score,
                        "total_urgency_score": stmt.excluded.total_urgency_score,
                        "urgency_tier": stmt.excluded.urgency_tier,
                        "confidence_level": stmt.excluded.confidence_level,
                        "recommended_action": stmt.excluded.recommended_action,
                        "has_aerial_analysis": stmt.excluded.has_aerial_analysis,
                        "aerial_image_url": stmt.excluded.aerial_image_url,
                        "image_quality": stmt.excluded.image_quality,
                        "confidence": stmt.excluded.confidence,
                        "overlays_url": stmt.excluded.overlays_url,
                        "last_updated_at": datetime.utcnow(),
                    },
                )
                await db.execute(stmt)

            await db.execute(
                sa.update(ContagionCluster)
                .where(ContagionCluster.id == cluster_id)
                .values(
                    properties_in_cluster=len(properties),
                    properties_scored=len(scores),
                    hot_leads_generated=sum(1 for s in scores if (s.get("total_urgency_score") or 0) >= 70),
                    last_scored_at=datetime.utcnow(),
                )
            )
            await db.commit()

            return {
                "cluster_id": cluster_id,
                "properties_found": len(properties),
                "properties_scored": len(scores),
                "ultra_hot": sum(1 for s in scores if (s.get("total_urgency_score") or 0) >= 90),
                "hot": sum(1 for s in scores if 70 <= (s.get("total_urgency_score") or 0) < 90),
                "warm": sum(1 for s in scores if 50 <= (s.get("total_urgency_score") or 0) < 70),
            }
        finally:
            await db.close()

    @classmethod
    async def get_hot_leads(
        cls,
        city: Optional[str] = None,
        state: Optional[str] = None,
        min_score: int = 70,
        limit: int = 100,
    ) -> List[Dict[str, object]]:
        db = await get_db()
        try:
            clauses = ["ps.total_urgency_score >= :min_score"]
            params: Dict[str, object] = {"min_score": min_score, "limit": limit}
            if city:
                clauses.append("p.city = :city")
                params["city"] = city
            if state:
                clauses.append("p.state = :state")
                params["state"] = state

            query = sa.text(
                f"""
                SELECT 
                    p.id,
                    p.address,
                    p.city,
                    p.state,
                    p.owner_name,
                    p.owner_phone,
                    ps.total_urgency_score,
                    ps.contagion_score,
                    ps.permits_within_quarter_mile,
                    ps.permits_within_500ft,
                    ps.nearest_permit_address,
                    ps.nearest_permit_distance_ft,
                    ps.image_quality,
                    ps.confidence,
                    ps.overlays_url,
                    cc.cluster_status
                FROM properties p
                JOIN property_scores ps ON p.id = ps.property_id
                LEFT JOIN contagion_clusters cc ON ps.cluster_id = cc.id
                WHERE {' AND '.join(clauses)}
                ORDER BY ps.total_urgency_score DESC
                LIMIT :limit
                """
            )
            rows = await db.fetch_all(query, params)
            return [dict(row) for row in rows]
        finally:
            await db.close()

    @classmethod
    async def list_clusters(
        cls,
        city: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, object]]:
        db = await get_db()
        try:
            params: Dict[str, object] = {"limit": limit}
            clauses = []
            if city:
                clauses.append("city = :city")
                params["city"] = city
            if state:
                clauses.append("state = :state")
                params["state"] = state

            where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            rows = await db.fetch_all(
                sa.text(
                    f"""
                    SELECT *
                    FROM contagion_clusters
                    {where_clause}
                    ORDER BY cluster_score DESC NULLS LAST, last_scored_at DESC NULLS LAST
                    LIMIT :limit
                    """
                ),
                params,
            )
            return [dict(row) for row in rows]
        finally:
            await db.close()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    @classmethod
    async def _calculate_property_score(
        cls,
        db,
        property_data: Dict[str, object],
        cluster: Dict[str, object],
        pipeline: Optional[EnhancedRoofAnalysisPipeline] = None,
    ) -> Dict[str, object]:
        property_geom = sa.text(
            "ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography"
        )
        geom_params = {
            "lat": property_data["latitude"],
            "lng": property_data["longitude"],
        }

        permits_within_quarter = await db.fetch_val(
            sa.text(
                """
                SELECT COUNT(*) FROM building_permits
                WHERE permit_date >= CURRENT_DATE - INTERVAL '90 days'
                  AND ST_DWithin(
                        COALESCE(geom, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography),
                        {geom},
                        402
                  )
                """.format(geom=property_geom.text)
            ),
            geom_params,
        )

        permits_within_500 = await db.fetch_val(
            sa.text(
                """
                SELECT COUNT(*) FROM building_permits
                WHERE permit_date >= CURRENT_DATE - INTERVAL '90 days'
                  AND ST_DWithin(
                        COALESCE(geom, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography),
                        {geom},
                        152
                  )
                """.format(geom=property_geom.text)
            ),
            geom_params,
        )

        same_subdivision = 0
        if property_data.get("subdivision_name"):
            same_subdivision = await db.fetch_val(
                sa.text(
                    """
                    SELECT COUNT(*) FROM building_permits
                    WHERE subdivision_name = :subdivision
                      AND permit_date >= CURRENT_DATE - INTERVAL '90 days'
                    """
                ),
                {"subdivision": property_data["subdivision_name"]},
            )

        contagion_score = cls._score_contagion(permits_within_quarter, permits_within_500, same_subdivision)

        nearest_permit = await db.fetch_one(
            sa.text(
                """
                SELECT address,
                       permit_date,
                       (ST_Distance(
                            COALESCE(geom, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography),
                            {geom}
                        ) * 3.28084) AS distance_ft
                FROM building_permits
                WHERE permit_date >= CURRENT_DATE - INTERVAL '90 days'
                ORDER BY COALESCE(geom, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) <-> {geom}::geometry
                LIMIT 1
                """.format(geom=property_geom.text)
            ),
            geom_params,
        )

        year_built = property_data.get("year_built")
        age_match_score = await cls._score_age_match(db, property_data, geom_params)

        financial_score = cls._score_financial(property_data)
        visual_score = cls._score_visual(property_data)

        image_quality_score: Optional[float] = None
        overlay_url: Optional[str] = None
        imagery_confidence: Optional[float] = None
        aerial_image_url: Optional[str] = property_data.get("aerial_image_url")
        has_aerial_analysis = False

        if (
            pipeline
            and property_data.get("latitude") is not None
            and property_data.get("longitude") is not None
        ):
            try:
                lat = float(property_data["latitude"])
                lng = float(property_data["longitude"])
                profile = PropertyProfile(
                    year_built=property_data.get("year_built"),
                    property_type=property_data.get("property_type"),
                    lot_size_sqft=property_data.get("lot_size_sqft"),
                    roof_material=property_data.get("roof_material"),
                    bedrooms=property_data.get("bedrooms"),
                    bathrooms=property_data.get("bathrooms"),
                    square_feet=property_data.get("square_feet"),
                    property_value=property_data.get("estimated_value"),
                    last_roof_replacement_year=None,
                    source="contagion",
                )
                enhanced = await pipeline.analyze_roof_with_quality_control(
                    property_id=str(property_data["id"]),
                    latitude=lat,
                    longitude=lng,
                    property_profile=profile,
                    enable_street_view=False,
                )
                has_aerial_analysis = True
                image_quality_score = enhanced.imagery.quality.overall_score
                imagery_confidence = enhanced.roof_analysis.confidence
                aerial_image_url = enhanced.imagery.public_url
                overlay_url = enhanced.anomaly_bundle.heatmap_url
                if enhanced.anomaly_bundle.heatmap_bytes:
                    overlay_url = save_overlay_png(
                        f"property-{property_data['id']}", enhanced.anomaly_bundle.heatmap_bytes
                    )
            except Exception as exc:  # noqa: BLE001
                logger.debug(
                    "contagion.imagery_fetch_failed",
                    property_id=property_data.get("id"),
                    error=str(exc),
                )

        total_score = (contagion_score or 0) + age_match_score + financial_score + visual_score
        urgency_tier, recommended_action = cls._classify_urgency(total_score)
        confidence_level = cls._confidence_level(property_data, contagion_score)

        return {
            "property_id": property_data["id"],
            "cluster_id": cluster["id"],
            "contagion_score": contagion_score,
            "permits_within_quarter_mile": permits_within_quarter,
            "permits_within_500ft": permits_within_500,
            "permits_within_100ft": 0,
            "same_subdivision_permits": same_subdivision,
            "nearest_permit_distance_ft": int(nearest_permit["distance_ft"]) if nearest_permit else None,
            "nearest_permit_address": nearest_permit.get("address") if nearest_permit else None,
            "nearest_permit_date": nearest_permit.get("permit_date") if nearest_permit else None,
            "age_match_score": age_match_score,
            "year_built": year_built,
            "roof_age_years": cls._roof_age(year_built),
            "matches_neighbor_age": age_match_score >= 20,
            "financial_score": financial_score,
            "home_value": property_data.get("estimated_value"),
            "estimated_equity_percent": property_data.get("equity_percent"),
            "visual_score": visual_score,
            "has_aerial_analysis": has_aerial_analysis,
            "aerial_image_url": aerial_image_url,
            "image_quality": image_quality_score,
            "confidence": imagery_confidence,
            "overlays_url": overlay_url,
            "total_urgency_score": total_score,
            "urgency_tier": urgency_tier,
            "confidence_level": confidence_level,
            "recommended_action": recommended_action,
            "scored_at": datetime.utcnow(),
            "scoring_version": "v1.5",
            "data_sources_used": None,
        }

    # ------------------------------------------------------------------
    # Scoring primitives
    # ------------------------------------------------------------------
    @staticmethod
    def _score_contagion(permits_quarter: Optional[int], permits_500: Optional[int], same_subdivision: Optional[int]) -> int:
        score = 0
        if (permits_quarter or 0) >= 5:
            score = 40
        elif (permits_quarter or 0) >= 3:
            score = 30
        elif (permits_quarter or 0) >= 1:
            score = 20
        if (permits_500 or 0) >= 3:
            score = min(40, score + 15)
        elif (permits_500 or 0) >= 1:
            score = min(40, score + 10)
        if (same_subdivision or 0) >= 3:
            score = min(40, score + 10)
        return score

    @staticmethod
    async def _score_age_match(db, property_data: Dict[str, object], geom_params: Dict[str, float]) -> int:
        year_built = property_data.get("year_built")
        if not year_built:
            return 0
        neighbors = await db.fetch_all(
            sa.text(
                """
                SELECT DISTINCT p.year_built
                FROM properties p
                JOIN building_permits bp ON ST_DWithin(
                    ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
                    {geom},
                    152
                )
                WHERE bp.permit_date >= CURRENT_DATE - INTERVAL '90 days'
                  AND p.year_built IS NOT NULL
                """.format(geom="ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography")
            ),
            geom_params,
        )
        best_diff = min((abs(year_built - n["year_built"]) for n in neighbors), default=None)
        if best_diff is None:
            return 10 if year_built <= (datetime.utcnow().year - 20) else 0
        if best_diff <= 2:
            return 25
        if best_diff <= 5:
            return 20
        if best_diff <= 10:
            return 15
        return 10 if year_built <= (datetime.utcnow().year - 20) else 0

    @staticmethod
    def _score_financial(property_data: Dict[str, object]) -> int:
        home_value = property_data.get("estimated_value") or 0
        equity_percent = property_data.get("equity_percent") or 0
        score = 0
        if home_value >= 400_000 and equity_percent >= 40:
            score = 20
        elif home_value >= 300_000 and equity_percent >= 30:
            score = 15
        elif home_value >= 250_000:
            score = 10
        elif home_value >= 200_000:
            score = 5
        if property_data.get("recent_refinance"):
            score = min(20, score + 5)
        if not property_data.get("has_liens"):
            score = min(20, score + 3)
        return score

    @staticmethod
    def _score_visual(property_data: Dict[str, object]) -> int:
        year_built = property_data.get("year_built")
        if not year_built:
            return 0
        roof_age = datetime.utcnow().year - year_built
        if roof_age >= 25:
            return 10
        if roof_age >= 20:
            return 7
        if roof_age >= 15:
            return 5
        return 0

    @staticmethod
    def _roof_age(year_built: Optional[int]) -> Optional[int]:
        if not year_built:
            return None
        return datetime.utcnow().year - year_built

    @staticmethod
    def _classify_urgency(score: int) -> Tuple[str, str]:
        if score >= 90:
            return "ultra_hot", "call_immediately"
        if score >= 70:
            return "hot", "schedule_this_week"
        if score >= 50:
            return "warm", "follow_up_soon"
        return "cold", "nurture_campaign"

    @staticmethod
    def _confidence_level(property_data: Dict[str, object], contagion_score: int) -> str:
        completeness = sum(
            1
            for field in (
                property_data.get("year_built"),
                property_data.get("estimated_value"),
                contagion_score,
                property_data.get("aerial_image_url"),
            )
            if field
        )
        if completeness >= 3:
            return "high"
        if completeness == 2:
            return "medium"
        return "low"

    @staticmethod
    def _calculate_cluster_score(permit_count: int, days_active: int, avg_value: float) -> int:
        volume = min(40, permit_count * 4)
        velocity = 30 if days_active < 30 else max(0, 30 - (days_active // 3))
        if avg_value >= 15000:
            value_score = 30
        elif avg_value >= 10000:
            value_score = 20
        elif avg_value >= 5000:
            value_score = 10
        else:
            value_score = 0
        return min(100, volume + velocity + value_score)

    @staticmethod
    def _determine_cluster_status(permit_count: int, days_active: int) -> str:
        permits_per_month = permit_count / max(1, days_active / 30)
        if permits_per_month >= 5:
            return "active"
        if permits_per_month >= 2:
            return "warming"
        if permits_per_month >= 0.5:
            return "cooling"
        return "saturated"

    @staticmethod
    async def _fetch_cluster_id(db, cluster_data: Dict[str, object]) -> Optional[str]:
        record = await db.fetch_one(
            sa.text(
                """
                SELECT id FROM contagion_clusters
                WHERE city = :city AND state = :state
                  AND center_latitude = :lat AND center_longitude = :lng
                """
            ),
            {
                "city": cluster_data["city"],
                "state": cluster_data["state"],
                "lat": cluster_data["center_latitude"],
                "lng": cluster_data["center_longitude"],
            },
        )
        return record["id"] if record else None
