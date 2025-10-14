"""Fish Mouth Permit Scraper Service.

Scrapes roofing permits from multiple municipal and county sources,
normalises the payload, geocodes locations, and persists them into the
`building_permits` table with PostGIS geography support.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import httpx
import sqlalchemy as sa

from app.core.config import get_settings
from app.core.database import get_db
from app.models import BuildingPermit


logger = logging.getLogger(__name__)
settings = get_settings()


class PermitScraperService:
    """Scrape building permits for roofing activity across US cities."""

    CITY_PORTALS: Dict[str, Dict[str, str]] = {
        "phoenix_az": {
            "url": "https://www.phoenix.gov/pddsite/Pages/Permit-Search.aspx",
            "type": "form_post",
        },
        "dallas_tx": {
            "url": "https://dallascityhall.com/departments/sustainabledevelopment/Pages/permits.aspx",
            "type": "api",
            "api_endpoint": "https://api.dallas.gov/permits/v1/search",
        },
        "atlanta_ga": {
            "url": "https://aca-prod.accela.com/atlanta",
            "type": "accela",
        },
        "denver_co": {
            "url": "https://www.denvergov.org/pocketgov/#/online-services/permits",
            "type": "api",
            "api_endpoint": "https://www.denvergov.org/maps/api/permits",
        },
        "charlotte_nc": {
            "url": "https://aca-prod.accela.com/charlotte",
            "type": "accela",
        },
    }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    @classmethod
    async def scrape_city(
        cls,
        city: str,
        state: str,
        days_back: int = 90,
        permit_types: Optional[List[str]] = None,
    ) -> Dict[str, object]:
        """Scrape permit data for a given city/state combination."""

        portal_key = f"{city.lower()}_{state.lower()}"
        logger.info("permit_scraper.start", city=city, state=state, days_back=days_back)

        config = cls.CITY_PORTALS.get(portal_key)
        if not config:
            logger.warning("permit_scraper.portal_missing", portal=portal_key)
            return await cls._scrape_generic_county(city, state, days_back)

        portal_type = config.get("type")
        if portal_type == "api":
            return await cls._scrape_api_portal(city, state, config, days_back, permit_types)
        if portal_type == "accela":
            return await cls._scrape_accela_portal(city, state, config, days_back)
        return await cls._scrape_form_portal(city, state, config, days_back)

    # ------------------------------------------------------------------
    # Portal handlers
    # ------------------------------------------------------------------
    @classmethod
    async def _scrape_api_portal(
        cls,
        city: str,
        state: str,
        config: Dict[str, str],
        days_back: int,
        permit_types: Optional[List[str]],
    ) -> Dict[str, object]:
        date_from = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        date_to = datetime.utcnow().strftime("%Y-%m-%d")
        params = {
            "dateFrom": date_from,
            "dateTo": date_to,
            "permitType": ",".join(permit_types or ["roofing"]),
            "status": "issued",
            "limit": 1000,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(
                    config["api_endpoint"],
                    params=params,
                    headers={"User-Agent": "FishMouth/1.0"},
                )
                response.raise_for_status()
            except httpx.HTTPError as exc:
                logger.exception("permit_scraper.api_error", city=city, error=str(exc))
                return {"status": "error", "error": str(exc)}

        permits = await cls._parse_api_response(response.json(), city, state)
        saved = await cls._save_permits(permits)
        return {
            "status": "success",
            "city": city,
            "state": state,
            "permits_found": len(permits),
            "permits_saved": saved,
        }

    @classmethod
    async def _scrape_accela_portal(
        cls,
        city: str,
        state: str,
        config: Dict[str, str],
        days_back: int,
    ) -> Dict[str, object]:
        base_url = config["url"].rstrip("/")
        api_url = f"{base_url}/api/records"
        payload = {
            "filterType": "permit",
            "module": "Building",
            "type": "Roofing",
            "dateFrom": (datetime.utcnow() - timedelta(days=days_back)).strftime("%m/%d/%Y"),
            "limit": 500,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    api_url,
                    json=payload,
                    headers={
                        "User-Agent": "FishMouth/1.0",
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
            except httpx.HTTPError as exc:
                logger.exception("permit_scraper.accela_error", city=city, error=str(exc))
                return {"status": "error", "error": str(exc)}

        permits = await cls._parse_accela_response(response.json(), city, state)
        saved = await cls._save_permits(permits)
        return {
            "status": "success",
            "city": city,
            "state": state,
            "permits_found": len(permits),
            "permits_saved": saved,
        }

    @classmethod
    async def _scrape_form_portal(
        cls,
        city: str,
        state: str,
        config: Dict[str, str],
        days_back: int,
    ) -> Dict[str, object]:
        logger.info("permit_scraper.form_portal_placeholder", city=city, state=state)
        # Placeholder until form-based scraping is implemented.
        return {
            "status": "unimplemented",
            "city": city,
            "state": state,
            "permits_found": 0,
            "permits_saved": 0,
        }

    @classmethod
    async def _scrape_generic_county(
        cls,
        city: str,
        state: str,
        days_back: int,
    ) -> Dict[str, object]:
        logger.info("permit_scraper.generic_fallback", city=city, state=state)
        return {
            "status": "unsupported",
            "city": city,
            "state": state,
            "permits_found": 0,
            "permits_saved": 0,
        }

    # ------------------------------------------------------------------
    # Parsing helpers
    # ------------------------------------------------------------------
    @classmethod
    async def _parse_api_response(cls, data: Dict[str, object], city: str, state: str) -> List[Dict[str, object]]:
        results = []
        for item in data.get("results", []):
            permit = {
                "address": cls._clean_address(item.get("address", "")),
                "city": city.title(),
                "state": state.upper(),
                "zip_code": item.get("zipCode", ""),
                "permit_number": item.get("permitNumber"),
                "permit_date": cls._parse_date(item.get("issuedDate")),
                "permit_type": cls._classify_permit_type(item.get("workType", "")),
                "permit_value": cls._safe_numeric(item.get("valuation")),
                "contractor_name": item.get("contractorName"),
                "contractor_license": item.get("contractorLicense"),
                "work_description": item.get("description"),
                "subdivision_name": item.get("subdivision"),
                "source_url": item.get("recordUrl"),
            }
            lat, lng = await cls._geocode_address(permit["address"], city, state)
            permit["latitude"] = lat
            permit["longitude"] = lng
            results.append(permit)
        return results

    @classmethod
    async def _parse_accela_response(cls, data: Dict[str, object], city: str, state: str) -> List[Dict[str, object]]:
        permits: List[Dict[str, object]] = []
        for record in data.get("records", []):
            info = record.get("primaryParcel", {})
            address = cls._clean_address(record.get("address", {}).get("display", ""))
            permit = {
                "address": address,
                "city": city.title(),
                "state": state.upper(),
                "zip_code": info.get("postalCode", ""),
                "permit_number": record.get("alternateId"),
                "permit_date": cls._parse_date(record.get("issuedDate")),
                "permit_type": cls._classify_permit_type(record.get("type", {}).get("type", "")),
                "contractor_name": record.get("licensedProfessional", {}).get("businessName"),
                "contractor_license": record.get("licensedProfessional", {}).get("licenseNumber"),
                "work_description": record.get("description"),
                "subdivision_name": info.get("subdivision"),
                "source_url": record.get("recordUrl"),
                "permit_value": cls._safe_numeric(record.get("jobValue")),
            }
            lat = info.get("latitude")
            lng = info.get("longitude")
            if lat and lng:
                permit["latitude"] = float(lat)
                permit["longitude"] = float(lng)
            else:
                geocoded = await cls._geocode_address(address, city, state)
                permit["latitude"], permit["longitude"] = geocoded
            permits.append(permit)
        return permits

    @staticmethod
    def _clean_address(address: str) -> str:
        return " ".join(address.split()).upper()

    @staticmethod
    def _parse_date(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y%m%d", "%m-%d-%Y"):
            try:
                return datetime.strptime(value, fmt).date()
            except (ValueError, TypeError):
                continue
        return None

    @staticmethod
    def _classify_permit_type(work_type: str) -> str:
        text = (work_type or "").lower()
        if any(token in text for token in ("re-roof", "reroof", "replacement")):
            return "Roof Replacement"
        if "repair" in text:
            return "Roof Repair"
        if "new" in text:
            return "New Construction Roof"
        return "Other Roofing"

    @staticmethod
    def _safe_numeric(value: Optional[object]) -> Optional[float]:
        if value in (None, "", "null"):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    # ------------------------------------------------------------------
    # Persistence helpers
    # ------------------------------------------------------------------
    @classmethod
    async def _save_permits(cls, permits: List[Dict[str, object]]) -> int:
        if not permits:
            return 0

        db = await get_db()
        saved = 0
        try:
            for payload in permits:
                payload = payload.copy()
                payload.setdefault("permit_date", datetime.utcnow().date())
                payload_defaults = {
                    "street_number": None,
                    "street_name": None,
                    "zip_code": None,
                    "permit_number": None,
                    "permit_type": None,
                    "permit_value": None,
                    "contractor_name": None,
                    "contractor_license": None,
                    "work_description": None,
                    "subdivision_name": None,
                    "parcel_id": None,
                    "source_url": None,
                }
                for key, default in payload_defaults.items():
                    payload.setdefault(key, default)
                exists_stmt = sa.select(BuildingPermit.id).where(
                    BuildingPermit.permit_number == payload.get("permit_number")
                )
                existing = await db.fetch_one(exists_stmt)
                if existing:
                    continue

                geom_fragment = ""
                if payload.get("latitude") is not None and payload.get("longitude") is not None:
                    geom_fragment = "ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography"

                insert_sql = """
                    INSERT INTO building_permits (
                        address,
                        street_number,
                        street_name,
                        city,
                        state,
                        zip_code,
                        latitude,
                        longitude,
                        permit_number,
                        permit_date,
                        permit_type,
                        permit_value,
                        contractor_name,
                        contractor_license,
                        work_description,
                        subdivision_name,
                        parcel_id,
                        source_url,
                        geom
                    ) VALUES (
                        :address,
                        :street_number,
                        :street_name,
                        :city,
                        :state,
                        :zip_code,
                        :latitude,
                        :longitude,
                        :permit_number,
                        :permit_date,
                        :permit_type,
                        :permit_value,
                        :contractor_name,
                        :contractor_license,
                        :work_description,
                        :subdivision_name,
                        :parcel_id,
                        :source_url,
                        {geom}
                    )
                    ON CONFLICT (permit_number) DO NOTHING
                    RETURNING id
                """.format(
                    geom=geom_fragment or "NULL",
                )

                if not geom_fragment:
                    payload.setdefault("latitude", None)
                    payload.setdefault("longitude", None)

                result = await db.execute(sa.text(insert_sql), payload)
                row = result.first()
                if row:
                    saved += 1

            await db.commit()
        finally:
            await db.close()

        return saved

    @classmethod
    async def _geocode_address(cls, address: str, city: str, state: str) -> Tuple[Optional[float], Optional[float]]:
        if not address or not settings.providers.google_maps_api_key:
            return None, None

        params = {
            "address": f"{address}, {city}, {state}",
            "key": settings.providers.google_maps_api_key,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get("https://maps.googleapis.com/maps/api/geocode/json", params=params)
                response.raise_for_status()
                data = response.json()
                if data.get("status") == "OK" and data.get("results"):
                    location = data["results"][0]["geometry"]["location"]
                    return location.get("lat"), location.get("lng")
            except httpx.HTTPError as exc:
                logger.warning("permit_scraper.geocode_failed", address=address, error=str(exc))
        return None, None
