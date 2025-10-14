from __future__ import annotations

import asyncio
import logging
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from config import get_settings
from database import SessionLocal
from models import AreaScan, Lead, LeadPriority, LeadStatus, LeadActivity
from services.ai.roof_analyzer import RoofAnalysisResult
from services.ai.roof_intelligence import EnhancedRoofAnalysisPipeline
from services.providers.contact_enrichment import ContactEnrichmentService, ContactProfile
from services.providers.property_discovery import PropertyCandidate, PropertyDiscoveryService
from services.providers.property_enrichment import PropertyEnrichmentService, PropertyProfile
from services.scan_progress import progress_notifier
from services.encryption import encrypt_value
from security import hash_pii


logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class LeadScoreResult:
    score: float
    priority: LeadPriority
    breakdown: Dict[str, float]


class LeadScoringEngine:
    """Comprehensive scoring engine for evaluating roofing replacement opportunities."""

    CONDITION_WEIGHT = 0.42
    AGE_WEIGHT = 0.25
    VALUE_WEIGHT = 0.15
    DAMAGE_WEIGHT = 0.10
    CONTACT_WEIGHT = 0.08

    def score(
        self,
        analysis: RoofAnalysisResult,
        property_profile: PropertyProfile,
        contact_profile: ContactProfile,
    ) -> LeadScoreResult:
        breakdown: Dict[str, float] = {}

        condition_component = max(0.0, (100 - analysis.condition_score)) * self.CONDITION_WEIGHT
        breakdown["condition"] = round(condition_component, 2)

        age_factor = min(analysis.roof_age_years / 30, 1.0)
        age_component = age_factor * 100 * self.AGE_WEIGHT
        breakdown["age"] = round(age_component, 2)

        property_value = property_profile.property_value or 0
        if property_value >= 600_000:
            value_component = 100
        elif property_value >= 400_000:
            value_component = 85
        elif property_value >= 250_000:
            value_component = 65
        elif property_value >= 150_000:
            value_component = 45
        else:
            value_component = 25
        value_component *= self.VALUE_WEIGHT
        breakdown["property_value"] = round(value_component, 2)

        damage_component = min(1.0, len(analysis.damage_indicators) / 4) * 100 * self.DAMAGE_WEIGHT
        breakdown["damage_indicators"] = round(damage_component, 2)

        contact_component = (contact_profile.confidence or 0.5) * 100 * self.CONTACT_WEIGHT
        breakdown["contact_confidence"] = round(contact_component, 2)

        raw_score = sum(breakdown.values())
        final_score = max(0.0, min(raw_score, 100.0))

        if final_score >= 82:
            priority = LeadPriority.HOT
        elif final_score >= 68:
            priority = LeadPriority.WARM
        else:
            priority = LeadPriority.COLD

        return LeadScoreResult(score=round(final_score, 1), priority=priority, breakdown=breakdown)


class LeadGenerationService:
    """Co-ordinates property discovery, AI roof analysis, scoring, and enrichment."""

    scoring_engine = LeadScoringEngine()

    def __init__(self, db: Session):
        self.db = db

    async def start_area_scan(
        self,
        user_id: int,
        area_name: str,
        scan_type: str = "city",
        scan_parameters: Optional[Dict[str, object]] = None,
    ) -> AreaScan:
        area_scan = AreaScan(
            user_id=user_id,
            area_name=area_name,
            scan_type=scan_type,
            status="queued",
            total_properties=0,
            processed_properties=0,
            qualified_leads=0,
            progress_percentage=0.0,
            scan_parameters=scan_parameters or {},
        )
        self.db.add(area_scan)
        self.db.commit()
        self.db.refresh(area_scan)

        self.dispatch_background_scan(area_scan.id)

        return area_scan

    @staticmethod
    def dispatch_background_scan(scan_id: int) -> None:
        if settings.feature_flags.use_inline_scan_runner:
            asyncio.create_task(LeadGenerationService._run_scan(scan_id))
        else:
            from celery_app import celery_app  # Lazy import to avoid circular dependency

            celery_app.send_task("tasks.scan_tasks.process_area_scan", args=[scan_id])

    @staticmethod
    async def _run_scan(scan_id: int) -> None:
        db = SessionLocal()
        try:
            service = LeadGenerationService(db)
            await service._process_area_scan(scan_id)
        except Exception as exc:
            logger.exception("Failed to process area scan %s", scan_id)
            # Ensure the scan is marked failed
            scan = db.query(AreaScan).filter(AreaScan.id == scan_id).first()
            if scan:
                scan.status = "failed"
                scan.error_message = str(exc)
                db.commit()
        finally:
            db.close()

    async def _process_area_scan(self, scan_id: int) -> None:
        area_scan = self.db.query(AreaScan).filter(AreaScan.id == scan_id).first()
        if not area_scan:
            logger.error("Area scan %s no longer exists", scan_id)
            return

        area_scan.status = "in_progress"
        area_scan.started_at = datetime.now(timezone.utc)
        self.db.commit()
        await self._emit_progress(area_scan)

        discovery = PropertyDiscoveryService()
        pipeline = EnhancedRoofAnalysisPipeline()
        property_enricher = PropertyEnrichmentService()
        contact_enricher = ContactEnrichmentService()

        scores: List[float] = []
        roof_ages: List[int] = []
        issues_counter: Counter = Counter()
        imagery_source_counter: Counter[str] = Counter()
        property_source_counter: Counter[str] = Counter()
        contact_source_counter: Counter[str] = Counter()
        failure_counter: Counter[str] = Counter()
        consecutive_failures = 0
        max_consecutive_failures = settings.pipeline_resilience.max_consecutive_candidate_failures

        property_cap = (area_scan.scan_parameters or {}).get("property_cap")
        candidate_limit = property_cap or settings.property_discovery_limit

        try:
            candidates = await discovery.discover(area_scan.area_name, candidate_limit)
            unique_candidates = self._deduplicate_candidates(candidates)
            area_scan.total_properties = len(unique_candidates)
            self.db.commit()
            await self._emit_progress(area_scan)

            if not unique_candidates:
                area_scan.status = "completed"
                area_scan.results_summary = {"message": "No candidate properties were discovered for this area."}
                area_scan.progress_percentage = 100.0
                area_scan.completed_at = datetime.now(timezone.utc)
                self.db.commit()
                await self._emit_progress(area_scan)
                return

            qualified_leads = 0

            for idx, candidate in enumerate(unique_candidates, start=1):
                await asyncio.sleep(0.05)  # Gentle throttling
                try:
                    result = await self._process_candidate(
                        area_scan,
                        candidate,
                        pipeline,
                        property_enricher,
                        contact_enricher,
                    )
                    if result:
                        (
                            lead,
                            score_result,
                            analysis,
                            property_profile,
                            contact_profile,
                        ) = result
                        qualified_leads += 1
                        scores.append(score_result.score)
                        roof_ages.append(analysis.roof_age_years)
                        issues_counter.update(lead.damage_indicators or [])
                        imagery_source = lead.ai_analysis.get("imagery", {}).get("source", "unknown")
                        imagery_source_counter[imagery_source] += 1
                        property_source_counter[property_profile.source] += 1
                        contact_source_counter[contact_profile.source] += 1
                        consecutive_failures = 0
                    else:
                        consecutive_failures = 0
                except Exception as exc:
                    failure_counter[exc.__class__.__name__] += 1
                    logger.exception("Error processing property candidate %s: %s", candidate.address, exc)
                    consecutive_failures += 1
                    if consecutive_failures >= max_consecutive_failures:
                        area_scan.status = "failed"
                        area_scan.error_message = (
                            f"Aborted scan after {consecutive_failures} consecutive failures. "
                            f"Last error: {exc.__class__.__name__}"
                        )
                        area_scan.completed_at = datetime.now(timezone.utc)
                        area_scan.results_summary = {
                            "qualified_leads": qualified_leads,
                            "processed_properties": idx,
                            "resilience": self._build_resilience_summary(
                                imagery_source_counter,
                                property_source_counter,
                                contact_source_counter,
                                failure_counter,
                            ),
                        }
                        self.db.commit()
                        await self._emit_progress(area_scan)
                        return
                    continue
                finally:
                    area_scan.processed_properties = idx
                    area_scan.qualified_leads = qualified_leads
                    area_scan.progress_percentage = (idx / area_scan.total_properties) * 100
                    self.db.commit()
                    await self._emit_progress(area_scan)

            area_scan.status = "completed"
            area_scan.completed_at = datetime.now(timezone.utc)
            area_scan.results_summary = self._build_results_summary(
                scores,
                roof_ages,
                issues_counter,
                "EnhancedRoofAnalysisPipeline",
                imagery_source_counter,
                property_source_counter,
                contact_source_counter,
                failure_counter,
                area_scan.processed_properties,
            )
            self.db.commit()
            await self._emit_progress(area_scan)

        finally:
            await asyncio.gather(
                discovery.aclose(),
                pipeline.aclose(),
                property_enricher.aclose(),
                contact_enricher.aclose(),
            )

    async def _process_candidate(
        self,
        area_scan: AreaScan,
        candidate: PropertyCandidate,
        pipeline: EnhancedRoofAnalysisPipeline,
        property_enricher: PropertyEnrichmentService,
        contact_enricher: ContactEnrichmentService,
    ) -> Optional[
        Tuple[Lead, LeadScoreResult, RoofAnalysisResult, PropertyProfile, ContactProfile]
    ]:
        property_profile = await property_enricher.enrich(candidate.address, candidate.latitude, candidate.longitude)
        property_identifier = candidate.address or f"{candidate.latitude:.5f},{candidate.longitude:.5f}"
        enhanced_result = await pipeline.analyze_roof_with_quality_control(
            property_id=property_identifier,
            latitude=candidate.latitude,
            longitude=candidate.longitude,
            property_profile=property_profile,
            enable_street_view=True,
        )

        analysis = enhanced_result.roof_analysis

        contact_profile = await contact_enricher.enrich(candidate.address, candidate.city, candidate.state)

        score_result = self.scoring_engine.score(analysis, property_profile, contact_profile)
        if score_result.score < settings.min_lead_score:
            return None

        imagery_quality = enhanced_result.imagery.quality
        quality_score = imagery_quality.overall_score
        critical_issues = {"cloud_cover", "heavy_shadows", "poor_roof_visibility"}
        has_critical_issue = any(issue in critical_issues for issue in imagery_quality.issues)
        if quality_score < 45:
            quality_status = "failed"
        elif quality_score < 55 or has_critical_issue:
            quality_status = "review"
        else:
            quality_status = "passed"

        street_assets = enhanced_result.street_view_assets
        street_view_summary = [
            {
                "heading": asset.heading,
                "distance_m": asset.distance_m,
                "quality_score": asset.quality_score,
                "occlusion_score": asset.occlusion_score,
                "public_url": asset.public_url,
                "anomalies": [
                    {
                        "type": anomaly.type,
                        "severity": anomaly.severity,
                        "probability": anomaly.probability,
                        "description": anomaly.description,
                    }
                    for anomaly in asset.anomalies
                ],
            }
            for asset in street_assets
        ]
        street_view_quality = None
        if street_assets:
            avg_quality = sum(a.quality_score for a in street_assets) / len(street_assets)
            avg_occlusion = sum(a.occlusion_score for a in street_assets) / len(street_assets)
            street_view_quality = {
                "angles_captured": len(street_assets),
                "average_quality": round(avg_quality, 3),
                "average_occlusion": round(avg_occlusion, 3),
                "headings": [a.heading for a in street_assets],
            }

        anomaly_types = {item.type for item in enhanced_result.anomaly_bundle.anomalies}
        damage_indicators = sorted(set(analysis.damage_indicators) | anomaly_types)
        analysis.damage_indicators = damage_indicators  # propagate enriched indicator list

        ai_payload = {
            "summary": analysis.summary,
            "metrics": analysis.metrics,
            "damage_indicators": damage_indicators,
            "replacement_urgency": analysis.replacement_urgency,
            "confidence": analysis.confidence,
            "score_breakdown": score_result.breakdown,
            "imagery": {
                "source": enhanced_result.imagery.source,
                "captured_at": enhanced_result.imagery.captured_at.isoformat(),
                "resolution": enhanced_result.imagery.resolution,
                "quality_status": quality_status,
                "quality": {
                    "score": quality_score,
                    "issues": imagery_quality.issues,
                    "metrics": imagery_quality.metrics,
                },
                "normalized_view_url": enhanced_result.normalized_view.image_url,
                "mask_url": enhanced_result.normalized_view.mask_url,
                "heatmap_url": enhanced_result.anomaly_bundle.heatmap_url,
            },
            "street_view": street_view_summary,
            "property_profile": asdict(property_profile),
            "contact_profile": asdict(contact_profile),
            "enhanced_roof_intelligence": enhanced_result.dossier,
        }

        lead = Lead(
            user_id=area_scan.user_id,
            area_scan_id=area_scan.id,
            address=candidate.address,
            city=candidate.city,
            state=candidate.state,
            zip_code=candidate.postal_code,
            latitude=candidate.latitude,
            longitude=candidate.longitude,
            roof_age_years=analysis.roof_age_years,
            roof_condition_score=analysis.condition_score,
            roof_material=property_profile.roof_material,
            roof_size_sqft=property_profile.square_feet,
            aerial_image_url=enhanced_result.imagery.public_url,
            ai_analysis=ai_payload,
            lead_score=score_result.score,
            priority=score_result.priority,
            replacement_urgency=analysis.replacement_urgency,
            damage_indicators=damage_indicators,
            discovery_status=candidate.source,
            imagery_status=enhanced_result.imagery.source,
            property_enrichment_status=property_profile.source,
            contact_enrichment_status=contact_profile.source,
            homeowner_name=contact_profile.homeowner_name,
            homeowner_email=contact_profile.email,
            homeowner_phone=contact_profile.phone,
            contact_enriched=bool(contact_profile.phone or contact_profile.email),
            homeowner_email_encrypted=encrypt_value(contact_profile.email),
            homeowner_phone_encrypted=encrypt_value(contact_profile.phone),
            property_value=property_profile.property_value,
            year_built=property_profile.year_built,
            property_type=property_profile.property_type,
            length_of_residence=contact_profile.length_of_residence_years,
            cost_to_generate=self._estimate_acquisition_cost(
                enhanced_result.imagery.source,
                contact_profile,
                len(street_assets),
            ),
            estimated_value=self._estimate_project_value(property_profile),
            conversion_probability=min(95.0, score_result.score + 12),
            status=LeadStatus.NEW,
            image_quality_score=quality_score,
            image_quality_issues=imagery_quality.issues,
            quality_validation_status=quality_status,
            roof_intelligence=enhanced_result.dossier,
            street_view_quality=street_view_quality,
        )

        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        lead.homeowner_email_hash = hash_pii(lead.homeowner_email)
        lead.homeowner_phone_hash = hash_pii(lead.homeowner_phone)
        self.db.commit()

        # Log creation activity for AI agent timeline
        activity = LeadActivity(
            lead_id=lead.id,
            user_id=area_scan.user_id,
            activity_type="scan_lead_created",
            title="New AI-qualified lead",
            description=analysis.summary,
            metadata={
                "score": score_result.score,
                "priority": score_result.priority.value,
                "damage_indicators": damage_indicators,
                "roof_age_years": analysis.roof_age_years,
                "imagery_source": lead.ai_analysis["imagery"]["source"],
                "property_enrichment": property_profile.source,
                "contact_enrichment": contact_profile.source,
                "discovery_source": candidate.source,
                "quality_score": quality_score,
                "heatmap_url": enhanced_result.anomaly_bundle.heatmap_url,
                "street_view_angles": [asset.heading for asset in street_assets],
            },
        )
        self.db.add(activity)
        self.db.commit()

        return lead, score_result, analysis, property_profile, contact_profile

    def get_scan_status(self, scan_id: int) -> Optional[AreaScan]:
        return self.db.query(AreaScan).filter(AreaScan.id == scan_id).first()

    def get_scan_results(self, scan_id: int, user_id: int) -> List[Lead]:
        return (
            self.db.query(Lead)
            .filter(Lead.area_scan_id == scan_id, Lead.user_id == user_id)
            .order_by(Lead.lead_score.desc())
            .all()
        )

    def _build_results_summary(
        self,
        scores: List[float],
        roof_ages: List[int],
        issues_counter: Counter,
        imagery_provider_name: str,
        imagery_source_counter: Counter[str],
        property_source_counter: Counter[str],
        contact_source_counter: Counter[str],
        failure_counter: Counter[str],
        processed_properties: int,
    ) -> Dict:
        resilience = self._build_resilience_summary(
            imagery_source_counter,
            property_source_counter,
            contact_source_counter,
            failure_counter,
        )
        if not scores:
            return {
                "qualified_leads": 0,
                "processed_properties": processed_properties,
                "message": "No properties met the scoring threshold for this scan.",
                "resilience": resilience,
            }

        average_score = round(sum(scores) / len(scores), 1)
        average_age = round(sum(roof_ages) / len(roof_ages), 1) if roof_ages else None

        return {
            "qualified_leads": len(scores),
            "processed_properties": processed_properties,
            "average_lead_score": average_score,
            "average_roof_age": average_age,
            "damage_distribution": dict(issues_counter),
            "imagery_provider": imagery_provider_name,
            "score_threshold": settings.min_lead_score,
            "resilience": resilience,
        }

    def _build_resilience_summary(
        self,
        imagery_source_counter: Counter[str],
        property_source_counter: Counter[str],
        contact_source_counter: Counter[str],
        failure_counter: Counter[str],
    ) -> Dict:
        return {
            "imagery_sources": dict(imagery_source_counter),
            "property_profile_sources": dict(property_source_counter),
            "contact_profile_sources": dict(contact_source_counter),
            "failures_by_exception": dict(failure_counter),
            "max_consecutive_failures": settings.pipeline_resilience.max_consecutive_candidate_failures,
        }

    async def _emit_progress(self, area_scan: AreaScan) -> None:
        payload = {
            "id": area_scan.id,
            "status": area_scan.status,
            "processed_properties": area_scan.processed_properties,
            "total_properties": area_scan.total_properties,
            "qualified_leads": area_scan.qualified_leads,
            "progress_percentage": area_scan.progress_percentage,
            "results_summary": area_scan.results_summary,
            "error_message": area_scan.error_message,
            "started_at": area_scan.started_at.isoformat() if area_scan.started_at else None,
            "completed_at": area_scan.completed_at.isoformat() if area_scan.completed_at else None,
        }
        await progress_notifier.publish(area_scan.id, payload)

    def _deduplicate_candidates(self, candidates: List[PropertyCandidate]) -> List[PropertyCandidate]:
        seen = set()
        unique: List[PropertyCandidate] = []
        for candidate in candidates:
            key = (round(candidate.latitude, 5), round(candidate.longitude, 5))
            if key in seen:
                continue
            seen.add(key)
            unique.append(candidate)
        return unique

    def _estimate_acquisition_cost(
        self,
        imagery_source: str,
        contact_profile: ContactProfile,
        street_view_count: int,
    ) -> float:
        base_cost = 0.35 if imagery_source != "generated" else 0.15
        contact_cost = 0.45 if contact_profile.confidence > 0.7 else 0.2
        street_cost = 0.18 * max(street_view_count, 0)
        return round(base_cost + contact_cost + street_cost, 2)

    def _estimate_project_value(self, property_profile: PropertyProfile) -> Optional[float]:
        if not property_profile.property_value:
            return None
        # Assume average roof replacement cost at 6% of property value, bounded.
        estimated = property_profile.property_value * 0.06
        return round(min(max(estimated, 8_500), 45_000), 2)
