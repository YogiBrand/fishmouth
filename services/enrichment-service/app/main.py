"""
Enrichment Service - Data validation and enrichment
Port: 8004
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import asyncio
import uuid
from datetime import datetime
import httpx
import json

import structlog

# Import our modules
import sys
sys.path.append('../../..')
from shared.database import db_client
from shared.redis_client import redis_client
from shared.observability import RequestContextMiddleware, setup_observability
from app.enrichment.property_enricher import PropertyEnricher
from app.enrichment.email_finder import EmailFinder
from app.enrichment.address_validator import AddressValidator

# FastAPI app
app = FastAPI(
    title="Enrichment Service",
    description="Data validation and enrichment for roofing leads",
    version="1.0.0"
)

SERVICE_NAME = "enrichment-service"
setup_observability(SERVICE_NAME)
logger = structlog.get_logger(SERVICE_NAME)
app.add_middleware(RequestContextMiddleware, service_name=SERVICE_NAME)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class EnrichmentRequest(BaseModel):
    source_table: str  # raw_permits, raw_properties, raw_contractors
    source_id: str
    enrichment_types: List[str]  # email_lookup, phone_lookup, address_validation

class PropertyEnrichmentRequest(BaseModel):
    property_id: Optional[str] = None
    address: str
    city: str
    state: str
    zip_code: Optional[str] = None
    owner_name: Optional[str] = None
    property_value: Optional[float] = None

class EmailLookupRequest(BaseModel):
    first_name: str
    last_name: str
    company_name: Optional[str] = None
    domain: Optional[str] = None
    address: Optional[str] = None

class EnrichmentStatus(BaseModel):
    id: str
    status: str
    result: Dict[str, Any]
    cost: float
    error_message: Optional[str] = None

# Initialize enrichment services
property_enricher = PropertyEnricher()
email_finder = EmailFinder()
address_validator = AddressValidator()

# Startup event
@app.on_event("startup")
async def startup():
    """Initialize connections"""
    try:
        await db_client.connect()
        await redis_client.connect()
        logger.info("startup.success")
    except Exception as e:
        logger.error("startup.failed", error=str(e))
        raise

@app.on_event("shutdown")
async def shutdown():
    """Clean up connections"""
    try:
        await db_client.disconnect()
        await redis_client.disconnect()
        logger.info("shutdown.success")
    except Exception as e:
        logger.error("shutdown.failed", error=str(e))

# Health endpoints
@app.get("/healthz")
async def healthz():
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/readyz")
async def readyz():
    """Readiness probe to verify dependencies."""
    try:
        # Test database
        await db_client.execute("SELECT 1")
        
        # Test Redis
        await redis_client.set("health_check", "ok", expire=60)
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "ok",
                "redis": "ok",
                "enrichers": "ok"
            }
        }
    except Exception as e:
        logger.error("readyz.failed", error=str(e))
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {e}")


@app.get("/health")
async def legacy_health():
    return await readyz()

# Property enrichment
@app.post("/enrich/property")
async def enrich_property(request: PropertyEnrichmentRequest):
    """Enrich property data"""
    try:
        logger.info(f"Enriching property: {request.address}")
        
        # Validate address first
        validated_address = await address_validator.validate_address(
            request.address, request.city, request.state, request.zip_code
        )
        
        # Enrich with additional property data
        enrichment_result = await property_enricher.enrich_property(
            validated_address['formatted_address'],
            validated_address['latitude'],
            validated_address['longitude'],
            getattr(request, 'owner_name', None),
            getattr(request, 'property_value', None)
        )
        
        return {
            "success": enrichment_result.success,
            "address": validated_address,
            "enriched_data": enrichment_result.data,
            "cost": enrichment_result.cost,
            "sources_used": enrichment_result.sources_used,
            "fallbacks_triggered": enrichment_result.fallbacks_triggered,
            "processing_time": enrichment_result.processing_time
        }
        
    except Exception as e:
        logger.error(f"Property enrichment failed: {e}")
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {e}")

# Email lookup
@app.post("/enrich/email")
async def lookup_email(request: EmailLookupRequest):
    """Find email for property owner"""
    try:
        logger.info(f"Finding email for: {request.first_name} {request.last_name}")
        
        email_results = await email_finder.find_email(
            request.first_name,
            request.last_name,
            request.company_name,
            request.domain,
            request.address
        )
        
        # Convert EmailResult objects to dictionaries
        emails_data = []
        total_cost = 0.0
        all_sources = set()
        
        for email_result in email_results:
            emails_data.append({
                "email": email_result.email,
                "confidence": email_result.confidence,
                "source": email_result.source,
                "verified": email_result.verified,
                "deliverable": email_result.deliverable,
                "verification_details": email_result.verification_details,
                "cost": email_result.cost
            })
            total_cost += email_result.cost
            all_sources.add(email_result.source)
        
        return {
            "success": True,
            "emails_found": len(emails_data),
            "emails": emails_data,
            "total_cost": total_cost,
            "sources_used": list(all_sources),
            "best_email": emails_data[0] if emails_data else None
        }
        
    except Exception as e:
        logger.error(f"Email lookup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Email lookup failed: {e}")

# Address validation
@app.post("/validate/address")
async def validate_address_endpoint(
    address: str,
    city: str,
    state: str,
    zip_code: Optional[str] = None
):
    """Validate and standardize address"""
    try:
        result = await address_validator.validate_address(address, city, state, zip_code)
        
        return {
            "success": True,
            "validated_address": result,
            "cost": result.get('cost', 0)
        }
        
    except Exception as e:
        logger.error(f"Address validation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Address validation failed: {e}")

# Background enrichment processing
async def process_enrichment_job(job_id: str, source_table: str, source_id: str, enrichment_types: List[str]):
    """Process enrichment job in background"""
    try:
        # Update job status to running
        await db_client.execute(
            "UPDATE enrichment_jobs SET status = 'running' WHERE id = $1",
            job_id
        )
        
        # Get source data
        if source_table == "raw_properties":
            query = """
            SELECT address, city, state, zip, owner_name, owner_address, owner_city, owner_state
            FROM raw_properties WHERE id = $1
            """
        elif source_table == "raw_permits":
            query = """
            SELECT address, city, state, contractor_name 
            FROM raw_permits WHERE id = $1
            """
        else:
            raise ValueError(f"Unsupported source table: {source_table}")
        
        source_data = await db_client.fetch_one(query, source_id)
        if not source_data:
            raise ValueError(f"Source record not found: {source_id}")
        
        total_cost = 0
        enrichment_results = {}
        
        # Process each enrichment type
        for enrichment_type in enrichment_types:
            try:
                if enrichment_type == "email_lookup" and source_data.get('owner_name'):
                    result = await email_finder.find_email(
                        source_data['owner_name'],
                        source_data.get('owner_address') or source_data['address'],
                        source_data.get('owner_city') or source_data['city'],
                        source_data.get('owner_state') or source_data['state']
                    )
                    enrichment_results['email'] = result
                    total_cost += result.get('cost', 0)
                
                elif enrichment_type == "address_validation":
                    result = await address_validator.validate_address(
                        source_data['address'],
                        source_data['city'], 
                        source_data['state']
                    )
                    enrichment_results['address'] = result
                    total_cost += result.get('cost', 0)
                
                elif enrichment_type == "property_enrichment":
                    # First validate address to get coordinates
                    validated_address = await address_validator.validate_address(
                        source_data['address'],
                        source_data['city'],
                        source_data['state']
                    )
                    
                    # Then enrich property data
                    result = await property_enricher.enrich_property(
                        validated_address['formatted_address'],
                        validated_address['latitude'],
                        validated_address['longitude']
                    )
                    enrichment_results['property'] = result
                    total_cost += result.get('cost', 0)
                    
            except Exception as e:
                logger.error(f"Enrichment failed for {enrichment_type}: {e}")
                enrichment_results[enrichment_type] = {"error": str(e)}
        
        # Update job as completed
        await db_client.execute("""
            UPDATE enrichment_jobs 
            SET status = 'completed', cost = $2, result = $3, completed_at = NOW()
            WHERE id = $1
        """, job_id, total_cost, json.dumps(enrichment_results))
        
        logger.info(f"✅ Enrichment job {job_id} completed with cost ${total_cost}")
        
    except Exception as e:
        logger.error(f"❌ Enrichment job {job_id} failed: {e}")
        await db_client.execute("""
            UPDATE enrichment_jobs 
            SET status = 'failed', error_message = $2
            WHERE id = $1
        """, job_id, str(e))

# Create enrichment job
@app.post("/jobs", response_model=EnrichmentStatus)
async def create_enrichment_job(request: EnrichmentRequest, background_tasks: BackgroundTasks):
    """Create a new enrichment job"""
    try:
        # Create job in database
        job_id = str(uuid.uuid4())
        await db_client.execute("""
            INSERT INTO enrichment_jobs (id, source_table, source_id, enrichment_type, status)
            VALUES ($1, $2, $3, $4, 'pending')
        """, job_id, request.source_table, request.source_id, ','.join(request.enrichment_types))
        
        # Start background processing
        background_tasks.add_task(
            process_enrichment_job,
            job_id,
            request.source_table,
            request.source_id,
            request.enrichment_types
        )
        
        logger.info(f"Created enrichment job {job_id}")
        
        return EnrichmentStatus(
            id=job_id,
            status="pending",
            result={},
            cost=0.0
        )
        
    except Exception as e:
        logger.error(f"Failed to create enrichment job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create job: {e}")

# Get enrichment job status
@app.get("/jobs/{job_id}", response_model=EnrichmentStatus)
async def get_enrichment_job_status(job_id: str):
    """Get status of an enrichment job"""
    try:
        query = """
        SELECT status, result, cost, error_message
        FROM enrichment_jobs WHERE id = $1
        """
        job = await db_client.fetch_one(query, job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        result = {}
        if job['result']:
            try:
                result = json.loads(job['result'])
            except json.JSONDecodeError:
                result = {"raw": job['result']}
        
        return EnrichmentStatus(
            id=job_id,
            status=job['status'],
            result=result,
            cost=float(job['cost'] or 0),
            error_message=job['error_message']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {e}")

# List recent jobs
@app.get("/jobs")
async def list_enrichment_jobs(limit: int = 20, status: Optional[str] = None):
    """List recent enrichment jobs"""
    try:
        base_query = """
        SELECT id, source_table, source_id, enrichment_type, status, 
               cost, created_at, completed_at
        FROM enrichment_jobs
        """
        
        if status:
            query = base_query + " WHERE status = $1 ORDER BY created_at DESC LIMIT $2"
            jobs = await db_client.fetch_all(query, status, limit)
        else:
            query = base_query + " ORDER BY created_at DESC LIMIT $1"
            jobs = await db_client.fetch_all(query, limit)
        
        return {
            "jobs": jobs,
            "count": len(jobs)
        }
        
    except Exception as e:
        logger.error(f"Failed to list jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list jobs: {e}")

# Batch enrichment endpoint
@app.post("/enrich/batch")
async def enrich_batch(
    source_table: str,
    enrichment_types: List[str],
    limit: int = 100,
    background_tasks: BackgroundTasks = None
):
    """Enrich a batch of records"""
    try:
        # Get unprocessed records
        query = f"""
        SELECT id FROM {source_table} 
        WHERE processed = FALSE
        ORDER BY created_at ASC
        LIMIT $1
        """
        records = await db_client.fetch_all(query, limit)
        
        job_ids = []
        for record in records:
            # Create enrichment job for each record
            job_id = str(uuid.uuid4())
            await db_client.execute("""
                INSERT INTO enrichment_jobs (id, source_table, source_id, enrichment_type, status)
                VALUES ($1, $2, $3, $4, 'pending')
            """, job_id, source_table, record['id'], ','.join(enrichment_types))
            
            # Start background processing
            if background_tasks:
                background_tasks.add_task(
                    process_enrichment_job,
                    job_id,
                    source_table,
                    record['id'],
                    enrichment_types
                )
            
            job_ids.append(job_id)
        
        return {
            "success": True,
            "records_queued": len(records),
            "job_ids": job_ids
        }
        
    except Exception as e:
        logger.error(f"Batch enrichment failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch enrichment failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
