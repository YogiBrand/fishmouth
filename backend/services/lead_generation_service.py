from __future__ import annotations

import asyncio
import logging
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from types import SimpleNamespace

import httpx
from sqlalchemy.orm import Session

from config import get_settings
from database import SessionLocal
from models import AreaScan, Lead, LeadPriority, LeadStatus, LeadActivity
from services.ai.roof_analyzer import RoofAnalysisResult
from services.ai.roof_intelligence import EnhancedRoofAnalysisPipeline
from services.ai.roof_intelligence.enhanced_pipeline import ImageryQualityReport
from services.etl import (
    EnrichmentCacheRepository,
    ETLJobLogger,
    JobMetrics,
    canonical_address_key,
    compute_dedupe_key,
    normalize_email,
    normalize_phone_number,
    verify_email_deliverability,
)
from services.providers.contact_enrichment import ContactEnrichmentService, ContactProfile
from services.providers.property_discovery import PropertyCandidate, PropertyDiscoveryService
from services.providers.property_enrichment import PropertyEnrichmentService, PropertyProfile
from services.scan_progress import progress_notifier
from services.encryption import encrypt_value
from security import hash_pii
from storage import save_overlay_png


logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class LeadScoreResult:
    score: float
    priority: LeadPriority
    breakdown: Dict[str, float]


@dataclass
class CandidateProcessingResult:
    lead: Lead
    score: LeadScoreResult
    analysis: RoofAnalysisResult
    property_profile: PropertyProfile
    contact_profile: ContactProfile
    merged: bool
    provenance: Dict[str, Dict[str, object]]
    quality_score: float
    quality_status: str
    cached_flags: Dict[str, bool]
    activity: LeadActivity


class LeadScoringEngine:
    """Comprehensive scoring engine for evaluating roofing replacement opportunities."""

    CONDITION_WEIGHT = 0.35
    AGE_WEIGHT = 0.21
    VALUE_WEIGHT = 0.14
    DAMAGE_WEIGHT = 0.12
    IMAGERY_WEIGHT = 0.10
    CONTACT_WEIGHT = 0.08
    SCORE_VERSION = "v1.5"

    def score(
        self,
        analysis: RoofAnalysisResult,
        property_profile: PropertyProfile,
        contact_profile: ContactProfile,
        imagery_quality: ImageryQualityReport,
    ) -> LeadScoreResult:
        breakdown: Dict[str, float] = {}

        condition_component = max(0.0, (100 - analysis.condition_score)) * self.CONDITION_WEIGHT
        breakdown["condition"] = round(condition_component, 2)

        roof_age_years = analysis.roof_age_years
        if roof_age_years is None and property_profile.year_built:
            current_year = datetime.now().year
            roof_age_years = max(current_year - property_profile.year_built, 0)
        age_factor = min((roof_age_years or 0) / 30, 1.0)
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

        quality_score = imagery_quality.overall_score or 0.0
        quality_factor = max(0.0, min(quality_score / 100.0, 1.0))
        quality_penalty = 0.0
        if "soft_focus" in imagery_quality.issues or imagery_quality.metrics.get("laplacian_variance", 0.0) < 0.0015:
            quality_penalty += 0.12
        if "low_resolution" in imagery_quality.issues or not imagery_quality.metrics.get("resolution_ok", True):
            quality_penalty += 0.08
        if "too_dark" in imagery_quality.issues or "too_bright" in imagery_quality.issues:
            quality_penalty += 0.05
        if "heavy_shadows" in imagery_quality.issues:
            quality_penalty += 0.04
        quality_penalty = min(quality_penalty, 0.6)
        imagery_component = max(0.0, (quality_factor - quality_penalty) * 100 * self.IMAGERY_WEIGHT)
        breakdown["imagery_quality"] = round(imagery_component, 2)

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

    @staticmethod
    def _compose_manual_address(
        address_line1: str,
        address_line2: Optional[str],
        city: Optional[str],
        state: Optional[str],
        postal_code: Optional[str],
    ) -> str:
        parts: List[str] = []
        if address_line1 and address_line1.strip():
            parts.append(address_line1.strip())
        if address_line2 and address_line2.strip():
            parts.append(address_line2.strip())
        locality = ", ".join(
            part.strip()
            for part in [city or "", state or "", postal_code or ""]
            if part and part.strip()
        )
        if locality:
            parts.append(locality)
        return ", ".join(parts)

    @staticmethod
    def _priority_from_label(label: Optional[str]) -> LeadPriority:
        if not label:
            return LeadPriority.COLD
        mapping = {
            "hot": LeadPriority.HOT,
            "warm": LeadPriority.WARM,
            "cold": LeadPriority.COLD,
        }
        return mapping.get(label.lower(), LeadPriority.COLD)

    @staticmethod
    def _infer_quality_status(report: ImageryQualityReport) -> str:
        score = float(report.overall_score or 0.0)
        critical_issues = {"cloud_cover", "heavy_shadows", "poor_roof_visibility"}
        has_critical = any(issue in critical_issues for issue in report.issues)
        if score < 45:
            return "failed"
        if score < 55 or has_critical:
            return "review"
        return "passed"

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
            logger.error("Area scan %s could not be located", scan_id)
            return

        area_scan.status = "in_progress"
        area_scan.started_at = datetime.now(timezone.utc)
        self.db.commit()
        await self._emit_progress(area_scan)

        discovery = PropertyDiscoveryService()
        pipeline = EnhancedRoofAnalysisPipeline()
        property_enricher = PropertyEnrichmentService()
        contact_enricher = ContactEnrichmentService()
        cache_repo = EnrichmentCacheRepository(self.db)

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

        with ETLJobLogger(self.db, job_type="area_scan", target=str(area_scan.id)) as job_logger:
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
                    job_logger.complete(
                        metrics=JobMetrics(
                            records_processed=0,
                            success_count=0,
                            skip_count=0,
                            error_count=0,
                            metadata={"scan_id": area_scan.id},
                        )
                    )
                    return

                new_leads = 0
                merged_leads = 0
                successful_candidates = 0

                for idx, candidate in enumerate(unique_candidates, start=1):
                    await asyncio.sleep(0.05)
                    try:
                        result = await self._process_candidate(
                            area_scan,
                            candidate,
                            pipeline,
                            property_enricher,
                            contact_enricher,
                            cache_repo,
                        )
                        if result:
                            successful_candidates += 1
                            if result.merged:
                                merged_leads += 1
                            else:
                                new_leads += 1
                            scores.append(result.score.score)
                            if result.analysis.roof_age_years is not None:
                                roof_ages.append(result.analysis.roof_age_years)
                            issues_counter.update(result.lead.damage_indicators or [])
                            imagery_source = result.lead.ai_analysis.get("imagery", {}).get("source", "unknown")
                            imagery_source_counter[imagery_source] += 1
                            property_source_counter[result.property_profile.source] += 1
                            contact_source_counter[result.contact_profile.source] += 1
                            consecutive_failures = 0
                        else:
                            consecutive_failures = 0
                    except Exception as exc:  # noqa: BLE001
                        failure_counter[exc.__class__.__name__] += 1
                        logger.exception("Error processing property candidate %s: %s", candidate.address, exc)
                        job_logger.log_error("candidate", f"{candidate.address or candidate.latitude}:{exc}")
                        self.db.rollback()
                        consecutive_failures += 1
                        if consecutive_failures >= max_consecutive_failures:
                            area_scan.status = "failed"
                            area_scan.error_message = (
                                f"Aborted scan after {consecutive_failures} consecutive failures. "
                                f"Last error: {exc.__class__.__name__}"
                            )
                            area_scan.completed_at = datetime.now(timezone.utc)
                            area_scan.results_summary = {
                                "qualified_leads": new_leads,
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
                            job_logger.fail(area_scan.error_message or "area scan failed")
                            return
                        continue
                    finally:
                        area_scan.processed_properties = idx
                        area_scan.qualified_leads = new_leads
                        area_scan.progress_percentage = (
                            (idx / area_scan.total_properties) * 100 if area_scan.total_properties else 100.0
                        )
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

                job_logger.complete(
                    metrics=JobMetrics(
                        records_processed=area_scan.processed_properties,
                        success_count=successful_candidates,
                        skip_count=merged_leads,
                        error_count=sum(failure_counter.values()),
                        metadata={
                            "scan_id": area_scan.id,
                            "new_leads": new_leads,
                            "merged_leads": merged_leads,
                        },
                    )
                )
            finally:
                await asyncio.gather(
                    discovery.aclose(),
                    pipeline.aclose(),
                    property_enricher.aclose(),
                    contact_enricher.aclose(),
                )

    async def _generate_manual_lead_inline(
        self,
        user_id: int,
        *,
        address_line1: str,
        address_line2: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        postal_code: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        include_street_view: bool = True,
    ) -> CandidateProcessingResult:
        """Process a single address outside the bulk area scan workflow."""

        if not address_line1 or not address_line1.strip():
            raise ValueError("Address line 1 is required")

        base_line = address_line1.strip()
        if address_line2 and address_line2.strip():
            base_line = f"{base_line}, {address_line2.strip()}"

        resolved_city = city.strip() if city else None
        resolved_state = state.strip() if state else None
        resolved_postal = postal_code.strip() if postal_code else None
        resolved_lat = latitude
        resolved_lon = longitude

        components: List[str] = [base_line]
        locality = ", ".join(part for part in [resolved_city, resolved_state, resolved_postal] if part)
        if locality:
            components.append(locality)
        full_address = ", ".join(filter(None, components))

        discovery: Optional[PropertyDiscoveryService] = None
        discovery_candidates: List[PropertyCandidate] = []
        if resolved_lat is None or resolved_lon is None:
            discovery = PropertyDiscoveryService()
            try:
                query = full_address if full_address else base_line
                discovery_candidates = await discovery.discover(query, limit=5)
            finally:
                await discovery.aclose()

            if not discovery_candidates:
                raise ValueError("Unable to geocode the supplied address")

            target_city = (resolved_city or "").lower()
            target_state = (resolved_state or "").lower()
            target_postal = (resolved_postal or "").replace(" ", "")
            best_candidate = None
            best_score = -1
            for item in discovery_candidates:
                score = 0
                if target_city and item.city and item.city.lower() == target_city:
                    score += 3
                if target_state and item.state and item.state.lower() == target_state:
                    score += 2
                if target_postal and item.postal_code and item.postal_code.replace(" ", "") == target_postal:
                    score += 4
                if score > best_score:
                    best_score = score
                    best_candidate = item
            candidate_match = best_candidate or discovery_candidates[0]
            resolved_lat = candidate_match.latitude
            resolved_lon = candidate_match.longitude
            resolved_city = resolved_city or candidate_match.city
            resolved_state = resolved_state or candidate_match.state
            resolved_postal = resolved_postal or candidate_match.postal_code
            if not full_address or not locality:
                components = [base_line]
                locality = ", ".join(
                    part for part in [candidate_match.city, candidate_match.state, candidate_match.postal_code] if part
                )
                if locality:
                    components.append(locality)
                full_address = ", ".join(filter(None, components))

        if resolved_lat is None or resolved_lon is None:
            raise ValueError("The address is missing latitude/longitude coordinates")

        candidate = PropertyCandidate(
            address=full_address,
            city=resolved_city,
            state=resolved_state,
            postal_code=resolved_postal,
            latitude=resolved_lat,
            longitude=resolved_lon,
            source="manual_lookup",
        )

        area_stub = SimpleNamespace(id=None, user_id=user_id)
        pipeline = EnhancedRoofAnalysisPipeline()
        property_enricher = PropertyEnrichmentService()
        contact_enricher = ContactEnrichmentService()
        cache_repo = EnrichmentCacheRepository(self.db)

        try:
            result = await self._process_candidate(
                area_stub,
                candidate,
                pipeline,
                property_enricher,
                contact_enricher,
                cache_repo,
                enable_street_view=include_street_view,
                min_score_override=0.0,
            )
        finally:
            await asyncio.gather(
                pipeline.aclose(),
                property_enricher.aclose(),
                contact_enricher.aclose(),
            )

        if result is None:
            raise ValueError("Unable to generate a qualified lead for the supplied address")

        return result

    async def generate_manual_lead(
        self,
        user_id: int,
        *,
        address_line1: str,
        address_line2: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        postal_code: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        include_street_view: bool = True,
    ) -> CandidateProcessingResult:
        """Entry point for manual SmartScan requests.

        Prefers the dedicated address lookup service when configured, with a graceful fallback
        to the legacy inline pipeline if the service is unavailable or fails.
        """

        if not address_line1 or not address_line1.strip():
            raise ValueError("Address line 1 is required")

        service_url = settings.address_lookup_service_url
        if service_url:
            composed_address = self._compose_manual_address(
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
            )
            try:
                return await self._generate_manual_lead_via_service(
                    user_id,
                    address_input=composed_address,
                    address_line1=address_line1,
                    address_line2=address_line2,
                    city=city,
                    state=state,
                    postal_code=postal_code,
                    include_street_view=include_street_view,
                )
            except Exception as exc:
                logger.exception(
                    "manual_lead.remote_failed",
                    extra={
                        "user_id": user_id,
                        "address": composed_address,
                        "error": str(exc),
                    },
                )

        return await self._generate_manual_lead_inline(
            user_id,
            address_line1=address_line1,
            address_line2=address_line2,
            city=city,
            state=state,
            postal_code=postal_code,
            latitude=latitude,
            longitude=longitude,
            include_street_view=include_street_view,
        )

    async def _generate_manual_lead_via_service(
        self,
        user_id: int,
        *,
        address_input: str,
        address_line1: str,
        address_line2: Optional[str],
        city: Optional[str],
        state: Optional[str],
        postal_code: Optional[str],
        include_street_view: bool,
    ) -> CandidateProcessingResult:
        service_url = settings.address_lookup_service_url
        if not service_url:
            raise ValueError("Address lookup service URL is not configured")

        payload = {"address": address_input}
        async with httpx.AsyncClient(timeout=settings.http_timeout_seconds) as client:
            response = await client.post(f"{service_url.rstrip('/')}/lookup", json=payload)
            response.raise_for_status()
            job_meta = response.json()
            job_id = job_meta.get("job_id")
            if not job_id:
                raise ValueError("Address lookup service did not return a job identifier")

            attempt = 0
            max_attempts = 60  # ~45 seconds worst case with backoff
            delay = 0.5
            while attempt < max_attempts:
                detail_resp = await client.get(f"{service_url.rstrip('/')}/lookup/{job_id}")
                detail_resp.raise_for_status()
                job_detail = detail_resp.json()
                status = job_detail.get("status")
                if status == "complete":
                    result_payload = job_detail.get("result")
                    if not result_payload:
                        raise ValueError("Address lookup completed without a result payload")
                    return self._build_manual_lead_from_lookup(
                        user_id,
                        result_payload,
                        include_street_view=include_street_view,
                    )
                if status == "failed":
                    raise ValueError(job_detail.get("error") or "Address lookup job failed")

                await asyncio.sleep(delay)
                attempt += 1
                delay = min(delay * 1.3, 2.0)

        raise TimeoutError("Address lookup job did not complete in time")

    def _build_manual_lead_from_lookup(
        self,
        user_id: int,
        lookup_result: Dict[str, Any],
        *,
        include_street_view: bool,
    ) -> CandidateProcessingResult:
        address_block = lookup_result.get("address") or {}
        geocode = address_block.get("geocode") or {}
        latitude = geocode.get("lat")
        longitude = geocode.get("lon")
        if latitude is None or longitude is None:
            raise ValueError("Address lookup response is missing coordinates")

        try:
            lat_f = float(latitude)
            lon_f = float(longitude)
        except (TypeError, ValueError) as exc:  # noqa: BLE001
            raise ValueError("Address lookup returned invalid coordinate values") from exc

        normalized_address = address_block.get("normalized") or address_block.get("input")
        if not normalized_address:
            normalized_address = f"{lat_f:.5f}, {lon_f:.5f}"

        components = geocode.get("components") or {}
        city = (
            components.get("city")
            or components.get("town")
            or components.get("municipality")
            or components.get("suburb")
            or components.get("borough")
        )
        state = components.get("state") or components.get("region")
        postal_code = (
            components.get("postcode")
            or components.get("postal_code")
            or components.get("zip")
        )

        property_payload = lookup_result.get("enrichment") or {}
        property_profile = PropertyProfile(
            year_built=property_payload.get("year_built"),
            property_type=property_payload.get("property_type"),
            lot_size_sqft=property_payload.get("lot_size_sqft"),
            roof_material=property_payload.get("roof_material"),
            bedrooms=property_payload.get("bedrooms"),
            bathrooms=property_payload.get("bathrooms"),
            square_feet=property_payload.get("square_feet"),
            property_value=property_payload.get("property_value"),
            last_roof_replacement_year=property_payload.get("last_roof_replacement_year"),
            source=property_payload.get("source", "synthetic"),
        )

        contact_payload = lookup_result.get("contact") or {}
        contact_profile = ContactProfile(
            homeowner_name=contact_payload.get("homeowner_name") or contact_payload.get("full_name"),
            email=contact_payload.get("email"),
            phone=contact_payload.get("phone"),
            length_of_residence_years=contact_payload.get("length_of_residence_years")
            or contact_payload.get("length_of_residence"),
            household_income=contact_payload.get("household_income"),
            confidence=float(contact_payload.get("confidence") or 0.6),
            source=contact_payload.get("source", "synthetic"),
        )

        normalized_phone = normalize_phone_number(contact_profile.phone)
        contact_profile.phone = normalized_phone
        normalized_email = normalize_email(contact_profile.email)
        if normalized_email and verify_email_deliverability(normalized_email):
            contact_profile.email = normalized_email
        else:
            contact_profile.email = None

        analysis_block = lookup_result.get("analysis") or {}
        roof_analysis_block = analysis_block.get("roof_analysis") or {}
        if not roof_analysis_block:
            raise ValueError("Address lookup response missing roof analysis data")

        roof_age_years = roof_analysis_block.get("roof_age_years")
        if roof_age_years is None and property_profile.year_built:
            roof_age_years = max(datetime.utcnow().year - property_profile.year_built, 0)

        analysis = RoofAnalysisResult(
            roof_age_years=roof_age_years or 0,
            condition_score=float(roof_analysis_block.get("condition_score") or 0.0),
            replacement_urgency=roof_analysis_block.get("replacement_urgency") or "plan_ahead",
            damage_indicators=list(roof_analysis_block.get("damage_indicators") or []),
            metrics=roof_analysis_block.get("metrics") or {},
            confidence=float(roof_analysis_block.get("confidence") or 0.6),
            summary=roof_analysis_block.get("summary") or "Roof analysis summary unavailable.",
        )

        imagery_block = analysis_block.get("imagery") or {}
        imagery_quality_block = imagery_block.get("quality") or {}
        imagery_quality = ImageryQualityReport(
            overall_score=float(imagery_quality_block.get("overall_score") or imagery_quality_block.get("score") or 0.0),
            metrics=imagery_quality_block.get("metrics") or {},
            issues=list(imagery_quality_block.get("issues") or []),
        )

        quality_result = lookup_result.get("quality") or {}
        quality_score = float(quality_result.get("quality_score") or imagery_quality.overall_score or 0.0)
        quality_status = quality_result.get("quality_status") or self._infer_quality_status(imagery_quality)

        score_data = quality_result.get("score") or {}
        if score_data:
            breakdown: Dict[str, float] = {}
            for key, value in (score_data.get("breakdown") or {}).items():
                try:
                    breakdown[str(key)] = float(value)
                except (TypeError, ValueError):
                    continue
            try:
                score_value = float(score_data.get("value"))
            except (TypeError, ValueError):
                score_value = float(quality_score)
            priority_enum = self._priority_from_label(score_data.get("priority"))
            score_result = LeadScoreResult(score=score_value, priority=priority_enum, breakdown=breakdown)
        else:
            score_result = self.scoring_engine.score(analysis, property_profile, contact_profile, imagery_quality)

        street_assets_raw = analysis_block.get("street_view_assets") or []
        street_view_summary: List[Dict[str, Any]] = []
        for asset in street_assets_raw:
            if not isinstance(asset, dict):
                continue
            street_view_summary.append(
                {
                    "heading": asset.get("heading"),
                    "distance_m": asset.get("distance_m"),
                    "quality_score": asset.get("quality_score"),
                    "occlusion_score": asset.get("occlusion_score"),
                    "public_url": asset.get("public_url"),
                    "anomalies": [
                        {
                            "type": anomaly.get("type"),
                            "severity": anomaly.get("severity"),
                            "probability": anomaly.get("probability"),
                            "description": anomaly.get("description"),
                        }
                        for anomaly in asset.get("anomalies", [])
                        if isinstance(anomaly, dict)
                    ],
                }
            )

        street_view_quality = None
        if street_view_summary:
            qualities = [item.get("quality_score", 0.0) or 0.0 for item in street_view_summary]
            occlusions = [item.get("occlusion_score", 0.0) or 0.0 for item in street_view_summary]
            street_view_quality = {
                "angles_captured": len(street_view_summary),
                "average_quality": round(sum(qualities) / len(qualities), 3) if qualities else 0.0,
                "average_occlusion": round(sum(occlusions) / len(occlusions), 3) if occlusions else 0.0,
                "headings": [item.get("heading") for item in street_view_summary if item.get("heading") is not None],
            }

        anomaly_bundle = analysis_block.get("anomaly_bundle") or {}
        anomaly_types = {
            anomaly.get("type")
            for anomaly in anomaly_bundle.get("anomalies", [])
            if isinstance(anomaly, dict) and anomaly.get("type")
        }
        damage_indicators = sorted(set(analysis.damage_indicators or []) | anomaly_types)
        analysis.damage_indicators = damage_indicators

        heatmap_url = anomaly_bundle.get("heatmap_url")
        imagery_source = imagery_block.get("source", "synthetic")
        normalized_view_block = analysis_block.get("normalized_view") or {}

        ai_payload = {
            "summary": analysis.summary,
            "metrics": analysis.metrics,
            "damage_indicators": damage_indicators,
            "replacement_urgency": analysis.replacement_urgency,
            "confidence": analysis.confidence,
            "score_breakdown": score_result.breakdown,
            "score_version": LeadScoringEngine.SCORE_VERSION,
            "imagery": {
                "source": imagery_source,
                "captured_at": imagery_block.get("captured_at"),
                "resolution": imagery_block.get("resolution"),
                "quality_status": quality_status,
                "quality": {
                    "score": quality_score,
                    "issues": imagery_quality.issues,
                    "metrics": imagery_quality.metrics,
                },
                "normalized_view_url": normalized_view_block.get("image_url"),
                "mask_url": normalized_view_block.get("mask_url"),
                "heatmap_url": heatmap_url,
            },
            "street_view": street_view_summary,
            "property_profile": asdict(property_profile),
            "contact_profile": asdict(contact_profile),
            "enhanced_roof_intelligence": analysis_block.get("dossier") or {},
        }

        address_key = canonical_address_key(normalized_address, city, state, postal_code)
        dedupe_key = compute_dedupe_key(contact_profile.homeowner_name, address_key)

        now_iso = datetime.utcnow().isoformat()
        provenance_entry = {
            "discovery": {"source": "manual_lookup", "timestamp": now_iso},
            "property_enrichment": {
                "source": property_profile.source,
                "cached": False,
                "timestamp": now_iso,
            },
            "contact_enrichment": {
                "source": contact_profile.source,
                "cached": False,
                "timestamp": now_iso,
            },
            "imagery": {
                "source": imagery_source,
                "quality_score": quality_score,
                "status": quality_status,
                "timestamp": now_iso,
            },
        }

        lead_payload: Dict[str, Any] = {
            "user_id": user_id,
            "area_scan_id": None,
            "address": normalized_address,
            "city": city,
            "state": state,
            "zip_code": postal_code,
            "latitude": lat_f,
            "longitude": lon_f,
            "roof_age_years": analysis.roof_age_years,
            "roof_condition_score": analysis.condition_score,
            "roof_material": property_profile.roof_material,
            "roof_size_sqft": property_profile.square_feet,
            "aerial_image_url": imagery_block.get("public_url"),
            "ai_analysis": ai_payload,
            "lead_score": float(score_result.score),
            "priority": score_result.priority,
            "replacement_urgency": analysis.replacement_urgency,
            "damage_indicators": damage_indicators,
            "discovery_status": "manual_lookup",
            "imagery_status": imagery_source,
            "property_enrichment_status": property_profile.source,
            "contact_enrichment_status": contact_profile.source,
            "homeowner_name": contact_profile.homeowner_name,
            "homeowner_email": contact_profile.email,
            "homeowner_phone": contact_profile.phone,
            "contact_enriched": bool(contact_profile.phone or contact_profile.email),
            "property_value": property_profile.property_value,
            "year_built": property_profile.year_built,
            "property_type": property_profile.property_type,
            "length_of_residence": contact_profile.length_of_residence_years,
            "cost_to_generate": self._estimate_acquisition_cost(
                imagery_source,
                contact_profile,
                len(street_view_summary) if include_street_view else 0,
            ),
            "estimated_value": self._estimate_project_value(property_profile),
            "conversion_probability": min(95.0, float(score_result.score) + 12.0),
            "status": LeadStatus.NEW,
            "image_quality_score": quality_score,
            "image_quality_issues": imagery_quality.issues,
            "quality_validation_status": quality_status,
            "analysis_confidence": analysis.confidence,
            "score_version": quality_result.get("version") or LeadScoringEngine.SCORE_VERSION,
            "roof_intelligence": analysis_block.get("dossier") or {},
            "street_view_quality": street_view_quality,
            "dedupe_key": dedupe_key,
            "dnc": False,
            "consent_email": False,
            "consent_sms": False,
            "consent_voice": False,
            "overlay_url": heatmap_url,
        }

        area_stub = SimpleNamespace(id=None, user_id=user_id)
        lead, merged = self._upsert_lead(area_stub, lead_payload, provenance_entry)
        lead.ai_analysis = ai_payload
        lead.analysis_confidence = analysis.confidence
        lead.score_version = lead_payload["score_version"]
        lead.overlay_url = heatmap_url or lead.overlay_url

        cached_flags = {"property": False, "contact": False}

        activity_metadata = {
            "score": score_result.score,
            "priority": score_result.priority.value,
            "damage_indicators": damage_indicators,
            "roof_age_years": analysis.roof_age_years,
            "imagery_source": imagery_source,
            "property_enrichment": property_profile.source,
            "contact_enrichment": contact_profile.source,
            "discovery_source": "manual_lookup",
            "quality_score": quality_score,
            "quality_status": quality_status,
            "heatmap_url": heatmap_url,
            "confidence": analysis.confidence,
            "street_view_angles": [item.get("heading") for item in street_view_summary if item.get("heading") is not None],
            "merged": merged,
            "cached": cached_flags,
        }
        if score_result.breakdown:
            activity_metadata["score_breakdown"] = score_result.breakdown
        if quality_result.get("recommended_actions"):
            activity_metadata["recommended_actions"] = quality_result.get("recommended_actions")

        activity = LeadActivity(
            lead_id=lead.id,
            user_id=user_id,
            activity_type="manual_lead_merged" if merged else "manual_lead_created",
            title="Lead updated via manual lookup" if merged else "Manual SmartScan lead",
            description=analysis.summary,
            metadata=activity_metadata,
        )
        self.db.add(activity)
        self.db.flush()

        return CandidateProcessingResult(
            lead=lead,
            score=score_result,
            analysis=analysis,
            property_profile=property_profile,
            contact_profile=contact_profile,
            merged=merged,
            provenance=provenance_entry,
            quality_score=quality_score,
            quality_status=quality_status,
            cached_flags=cached_flags,
            activity=activity,
        )

    async def _process_candidate(
        self,
        area_scan: AreaScan,
        candidate: PropertyCandidate,
        pipeline: EnhancedRoofAnalysisPipeline,
        property_enricher: PropertyEnrichmentService,
        contact_enricher: ContactEnrichmentService,
        cache_repo: EnrichmentCacheRepository,
        *,
        enable_street_view: bool = True,
        min_score_override: Optional[float] = None,
    ) -> Optional[CandidateProcessingResult]:
        address_key = canonical_address_key(
            candidate.address,
            candidate.city,
            candidate.state,
            candidate.postal_code,
        )
        cached_flags = {"property": False, "contact": False}

        property_payload = cache_repo.get("property", address_key)
        if property_payload:
            property_profile = PropertyProfile(**property_payload)
            cached_flags["property"] = True
        else:
            property_profile = await property_enricher.enrich(
                candidate.address,
                candidate.latitude,
                candidate.longitude,
            )
            cache_repo.set("property", address_key, asdict(property_profile))

        property_identifier = candidate.address or f"{candidate.latitude:.5f},{candidate.longitude:.5f}"
        enhanced_result = await pipeline.analyze_roof_with_quality_control(
            property_id=property_identifier,
            latitude=candidate.latitude,
            longitude=candidate.longitude,
            property_profile=property_profile,
            enable_street_view=enable_street_view,
        )
        analysis = enhanced_result.roof_analysis

        imagery_quality = enhanced_result.imagery.quality
        quality_score = float(imagery_quality.overall_score or 0.0)
        critical_issues = {"cloud_cover", "heavy_shadows", "poor_roof_visibility"}
        has_critical_issue = any(issue in critical_issues for issue in imagery_quality.issues)
        if quality_score < 45:
            quality_status = "failed"
        elif quality_score < 55 or has_critical_issue:
            quality_status = "review"
        else:
            quality_status = "passed"

        contact_payload = cache_repo.get("contact", address_key)
        if contact_payload:
            contact_profile = ContactProfile(**contact_payload)
            cached_flags["contact"] = True
        else:
            contact_profile = await contact_enricher.enrich(
                candidate.address,
                candidate.city,
                candidate.state,
            )
            cache_repo.set("contact", address_key, asdict(contact_profile))

        normalized_phone = normalize_phone_number(contact_profile.phone)
        contact_profile.phone = normalized_phone
        normalized_email = normalize_email(contact_profile.email)
        if normalized_email and verify_email_deliverability(normalized_email):
            contact_profile.email = normalized_email
        else:
            contact_profile.email = None

        score_result = self.scoring_engine.score(analysis, property_profile, contact_profile)
        score_threshold = settings.min_lead_score if min_score_override is None else min_score_override
        if score_result.score < score_threshold:
            return None

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
        damage_indicators = sorted(set(analysis.damage_indicators or []) | anomaly_types)
        analysis.damage_indicators = damage_indicators

        ai_payload = {
            "summary": analysis.summary,
            "metrics": analysis.metrics,
            "damage_indicators": damage_indicators,
            "replacement_urgency": analysis.replacement_urgency,
            "confidence": analysis.confidence,
            "score_breakdown": score_result.breakdown,
            "score_version": LeadScoringEngine.SCORE_VERSION,
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

        now_iso = datetime.utcnow().isoformat()
        provenance_entry = {
            "discovery": {"source": candidate.source, "timestamp": now_iso},
            "property_enrichment": {
                "source": property_profile.source,
                "cached": cached_flags["property"],
                "timestamp": now_iso,
            },
            "contact_enrichment": {
                "source": contact_profile.source,
                "cached": cached_flags["contact"],
                "timestamp": now_iso,
            },
            "imagery": {
                "source": enhanced_result.imagery.source,
                "quality_score": quality_score,
                "status": quality_status,
                "timestamp": now_iso,
            },
        }

        dedupe_key = compute_dedupe_key(contact_profile.homeowner_name, address_key)

        lead_payload: Dict[str, Any] = {
            "user_id": area_scan.user_id,
            "area_scan_id": area_scan.id,
            "address": candidate.address,
            "city": candidate.city,
            "state": candidate.state,
            "zip_code": candidate.postal_code,
            "latitude": candidate.latitude,
            "longitude": candidate.longitude,
            "roof_age_years": analysis.roof_age_years,
            "roof_condition_score": analysis.condition_score,
            "roof_material": property_profile.roof_material,
            "roof_size_sqft": property_profile.square_feet,
            "aerial_image_url": enhanced_result.imagery.public_url,
            "ai_analysis": ai_payload,
            "lead_score": score_result.score,
            "priority": score_result.priority,
            "replacement_urgency": analysis.replacement_urgency,
            "damage_indicators": damage_indicators,
            "discovery_status": candidate.source,
            "imagery_status": enhanced_result.imagery.source,
            "property_enrichment_status": property_profile.source,
            "contact_enrichment_status": contact_profile.source,
            "homeowner_name": contact_profile.homeowner_name,
            "homeowner_email": contact_profile.email,
            "homeowner_phone": contact_profile.phone,
            "contact_enriched": bool(contact_profile.phone or contact_profile.email),
            "property_value": property_profile.property_value,
            "year_built": property_profile.year_built,
            "property_type": property_profile.property_type,
            "length_of_residence": contact_profile.length_of_residence_years,
            "cost_to_generate": self._estimate_acquisition_cost(
                enhanced_result.imagery.source,
                contact_profile,
                len(street_assets),
            ),
            "estimated_value": self._estimate_project_value(property_profile),
            "conversion_probability": min(95.0, score_result.score + 12),
            "status": LeadStatus.NEW,
            "image_quality_score": quality_score,
            "image_quality_issues": imagery_quality.issues,
            "quality_validation_status": quality_status,
            "analysis_confidence": analysis.confidence,
            "score_version": LeadScoringEngine.SCORE_VERSION,
            "roof_intelligence": enhanced_result.dossier,
            "street_view_quality": street_view_quality,
            "dedupe_key": dedupe_key,
            "provenance": {},
            "dnc": False,
            "consent_email": False,
            "consent_sms": False,
            "consent_voice": False,
        }

        lead, merged = self._upsert_lead(area_scan, lead_payload, provenance_entry)

        overlay_url = None
        if enhanced_result.anomaly_bundle.heatmap_bytes:
            overlay_url = save_overlay_png(str(lead.id), enhanced_result.anomaly_bundle.heatmap_bytes)
            lead.overlay_url = overlay_url
            ai_payload["imagery"]["heatmap_url"] = overlay_url
            ai_payload["imagery"]["overlay_url"] = overlay_url
            if lead.roof_intelligence:
                roof_intel = dict(lead.roof_intelligence)
                heatmap_section = dict((roof_intel.get("heatmap") or {}))
                heatmap_section["url"] = overlay_url
                heatmap_section["path"] = f"overlays/{lead.id}.png"
                roof_intel["heatmap"] = heatmap_section
                lead.roof_intelligence = roof_intel
        else:
            lead.overlay_url = lead.overlay_url or None

        lead.analysis_confidence = analysis.confidence
        lead.score_version = LeadScoringEngine.SCORE_VERSION
        lead.ai_analysis = ai_payload

        activity_metadata = {
            "score": score_result.score,
            "priority": score_result.priority.value,
            "damage_indicators": damage_indicators,
            "roof_age_years": analysis.roof_age_years,
            "imagery_source": enhanced_result.imagery.source,
            "property_enrichment": property_profile.source,
            "contact_enrichment": contact_profile.source,
            "discovery_source": candidate.source,
            "quality_score": quality_score,
            "heatmap_url": overlay_url or enhanced_result.anomaly_bundle.heatmap_url,
            "confidence": analysis.confidence,
            "street_view_angles": [asset.heading for asset in street_assets],
            "merged": merged,
            "cached": cached_flags,
        }

        activity_prefix = "manual" if candidate.source == "manual_lookup" else "scan"
        if candidate.source == "manual_lookup":
            activity_title = "Lead updated via manual lookup" if merged else "Manual SmartScan lead"
        else:
            activity_title = "Lead updated via dedupe merge" if merged else "New AI-qualified lead"
        activity = LeadActivity(
            lead_id=lead.id,
            user_id=area_scan.user_id,
            activity_type=f"{activity_prefix}_lead_merged" if merged else f"{activity_prefix}_lead_created",
            title=activity_title,
            description=analysis.summary,
            metadata=activity_metadata,
        )
        self.db.add(activity)
        self.db.flush()

        return CandidateProcessingResult(
            lead=lead,
            score=score_result,
            analysis=analysis,
            property_profile=property_profile,
            contact_profile=contact_profile,
            merged=merged,
            provenance=provenance_entry,
            quality_score=quality_score,
            quality_status=quality_status,
            cached_flags=cached_flags,
            activity=activity,
        )


    def _upsert_lead(
        self,
        area_scan: AreaScan,
        payload: Dict[str, Any],
        provenance_entry: Dict[str, Dict[str, object]],
    ) -> Tuple[Lead, bool]:
        dedupe_key = payload.get("dedupe_key")
        lead = (
            self.db.query(Lead)
            .filter(Lead.user_id == area_scan.user_id, Lead.dedupe_key == dedupe_key)
            .one_or_none()
        )

        if lead is None:
            payload["provenance"] = {key: [value] for key, value in provenance_entry.items()}
            lead = Lead(**payload)
            self.db.add(lead)
            merged = False
        else:
            self._merge_lead_record(lead, payload)
            lead.provenance = self._merge_provenance(lead.provenance or {}, provenance_entry)
            merged = True

        self._update_pii_hashes(lead)
        lead.updated_at = datetime.utcnow()
        self.db.flush()
        return lead, merged


    def _merge_lead_record(self, lead: Lead, payload: Dict[str, Any]) -> None:
        priority_rank = {
            LeadPriority.COLD: 1,
            LeadPriority.WARM: 2,
            LeadPriority.HOT: 3,
        }

        for key, value in payload.items():
            if key in {"id", "user_id", "area_scan_id", "dedupe_key", "provenance", "created_at"}:
                continue
            if value is None:
                continue
            if key == "priority" and isinstance(value, LeadPriority):
                existing = priority_rank.get(lead.priority, 0)
                incoming = priority_rank.get(value, 0)
                if incoming > existing:
                    lead.priority = value
                continue
            if key == "lead_score":
                lead.lead_score = max(lead.lead_score or 0.0, float(value))
                continue
            if key == "conversion_probability":
                lead.conversion_probability = max(lead.conversion_probability or 0.0, float(value))
                continue
            if key == "damage_indicators":
                existing = set(lead.damage_indicators or [])
                incoming = set(value or [])
                if incoming:
                    lead.damage_indicators = sorted(existing | incoming)
                continue
            if key == "tags":
                existing = set(lead.tags or [])
                incoming = set(value or [])
                if incoming:
                    lead.tags = sorted(existing | incoming)
                continue
            if key == "status" and lead.status and lead.status != LeadStatus.NEW:
                continue
            if hasattr(Lead, key):
                setattr(lead, key, value)

        lead.contact_enriched = lead.contact_enriched or bool(payload.get("contact_enriched"))
        lead.dnc = bool(payload.get("dnc", lead.dnc))
        lead.consent_email = lead.consent_email or bool(payload.get("consent_email"))
        lead.consent_sms = lead.consent_sms or bool(payload.get("consent_sms"))
        lead.consent_voice = lead.consent_voice or bool(payload.get("consent_voice"))


    def _merge_provenance(
        self,
        existing: Dict[str, Any],
        incoming: Dict[str, Dict[str, object]],
    ) -> Dict[str, Any]:
        merged: Dict[str, list] = {}
        for key, value in (existing or {}).items():
            if isinstance(value, list):
                merged[key] = list(value)
            else:
                merged[key] = [value]
        for key, value in incoming.items():
            merged.setdefault(key, [])
            merged[key].append(value)
        return merged


    def _update_pii_hashes(self, lead: Lead) -> None:
        if lead.homeowner_email:
            lead.homeowner_email_encrypted = encrypt_value(lead.homeowner_email)
            lead.homeowner_email_hash = hash_pii(lead.homeowner_email)
        else:
            lead.homeowner_email_encrypted = None
            lead.homeowner_email_hash = None

        if lead.homeowner_phone:
            lead.homeowner_phone_encrypted = encrypt_value(lead.homeowner_phone)
            lead.homeowner_phone_hash = hash_pii(lead.homeowner_phone)
        else:
            lead.homeowner_phone_encrypted = None
            lead.homeowner_phone_hash = None

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
