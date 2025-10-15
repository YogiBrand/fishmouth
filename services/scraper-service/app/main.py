"""
Scraper Service - Intelligent web scraping with Crawl4AI and Ollama
Port: 8011
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
import asyncio
import uuid
from datetime import datetime

import structlog

# Import our modules
import sys
sys.path.append('../../..')
from shared.database import db_client
from shared.redis_client import redis_client
from shared.observability import RequestContextMiddleware, setup_observability
from app.scrapers.smart_scraper import SmartScraper, scrape_urls_batch
from app.utils.llm import llm

# FastAPI app
app = FastAPI(
    title="Scraper Service",
    description="Intelligent web scraping for roofing lead generation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICE_NAME = "scraper-service"
setup_observability(SERVICE_NAME)
logger = structlog.get_logger(SERVICE_NAME)
app.add_middleware(RequestContextMiddleware, service_name=SERVICE_NAME)

# Pydantic models
class ScrapeRequest(BaseModel):
    url: HttpUrl
    scrape_type: str = "permits"  # permits, property, contractor
    wait_for: Optional[str] = None
    js_code: Optional[str] = None
    use_cache: bool = True

class BatchScrapeRequest(BaseModel):
    urls: List[HttpUrl]
    scrape_type: str = "permits"
    max_concurrent: int = 5

class JobRequest(BaseModel):
    job_type: str  # permit, property, contractor
    city: str
    state: str
    urls: List[HttpUrl]
    metadata: Optional[Dict[str, Any]] = {}

class JobStatus(BaseModel):
    id: str
    status: str
    progress: Dict[str, Any]

# Startup event
@app.on_event("startup")
async def startup():
    """Initialize connections"""
    try:
        await db_client.connect()
        await redis_client.connect()
        logger.info("✅ Scraper Service started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to start Scraper Service: {e}")
        raise

@app.on_event("shutdown")
async def shutdown():
    """Clean up connections"""
    try:
        await db_client.disconnect()
        await redis_client.disconnect()
        logger.info("✅ Scraper Service shut down cleanly")
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

# Health and readiness probes
@app.get("/healthz")
async def healthz():
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/readyz")
async def readyz():
    """Readiness probe that validates downstream dependencies."""
    try:
        # Test database
        await db_client.execute("SELECT 1")
        
        # Test Redis
        await redis_client.set("health_check", "ok", expire=60)
        
        # Test LLM
        test_extraction = llm.extract_json("test data", "Extract test: return {\"status\": \"ok\"}")
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "ok",
                "redis": "ok",
                "llm": "ok" if test_extraction else "degraded"
            }
        }
    except Exception as e:
        logger.error("readyz.failed", error=str(e))
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {e}")


# Backwards compatibility
@app.get("/health")
async def legacy_health():
    return await readyz()

# Single URL scraping
@app.post("/scrape")
async def scrape_url(request: ScrapeRequest):
    """Scrape a single URL"""
    try:
        logger.info(f"Scraping {request.url} ({request.scrape_type})")
        
        async with SmartScraper() as scraper:
            if request.scrape_type == "permits":
                result = await scraper.scrape_permits(
                    str(request.url),
                    wait_for=request.wait_for,
                    js_code=request.js_code
                )
            elif request.scrape_type == "property":
                result = await scraper.scrape_property(
                    str(request.url),
                    wait_for=request.wait_for
                )
            elif request.scrape_type == "contractor":
                result = await scraper.scrape_contractor(str(request.url))
            else:
                raise HTTPException(status_code=400, detail="Invalid scrape_type")
        
        return {
            "success": True,
            "url": str(request.url),
            "scrape_type": request.scrape_type,
            "data": result,
            "count": len(result) if isinstance(result, list) else (1 if result else 0)
        }
        
    except Exception as e:
        logger.error(f"Scraping failed for {request.url}: {e}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {e}")

# Batch URL scraping
@app.post("/scrape/batch")
async def scrape_batch(request: BatchScrapeRequest):
    """Scrape multiple URLs concurrently"""
    try:
        logger.info(f"Batch scraping {len(request.urls)} URLs ({request.scrape_type})")
        
        urls = [str(url) for url in request.urls]
        
        # Map scrape types to method names
        method_map = {
            "permits": "scrape_permits",
            "property": "scrape_property", 
            "contractor": "scrape_contractor"
        }
        
        if request.scrape_type not in method_map:
            raise HTTPException(status_code=400, detail="Invalid scrape_type")
        
        results = await scrape_urls_batch(
            urls,
            scraper_method=method_map[request.scrape_type],
            max_concurrent=request.max_concurrent
        )
        
        return {
            "success": True,
            "scrape_type": request.scrape_type,
            "urls_requested": len(request.urls),
            "records_found": len(results),
            "data": results
        }
        
    except Exception as e:
        logger.error(f"Batch scraping failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch scraping failed: {e}")

# Background job processing
async def process_scraping_job(job_id: str, job_type: str, city: str, state: str, urls: List[str], metadata: Dict):
    """Process scraping job in background"""
    try:
        # Update job status to running
        await db_client.update_scraping_job(job_id, "running")
        
        # Scrape all URLs
        method_map = {
            "permit": "scrape_permits",
            "property": "scrape_property",
            "contractor": "scrape_contractor"
        }
        
        if job_type not in method_map:
            raise ValueError(f"Invalid job_type: {job_type}")
        
        results = await scrape_urls_batch(urls, method_map[job_type], max_concurrent=5)
        
        # Store results in database based on job type
        records_succeeded = 0
        records_failed = 0
        
        for result in results:
            try:
                if job_type == "permit" and result:
                    # Store in raw_permits table
                    query = """
                    INSERT INTO raw_permits (
                        job_id, permit_number, address, city, state, zip,
                        issue_date, permit_type, work_description, contractor_name,
                        contractor_license, estimated_value, raw_data
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    """
                    await db_client.execute(
                        query,
                        job_id,
                        result.get('permit_number'),
                        result.get('address'),
                        result.get('city'),
                        result.get('state'), 
                        result.get('zip'),
                        result.get('issue_date'),
                        result.get('permit_type'),
                        result.get('work_description'),
                        result.get('contractor_name'),
                        result.get('contractor_license'),
                        result.get('estimated_value'),
                        result
                    )
                    records_succeeded += 1
                
                elif job_type == "property" and result:
                    # Store in raw_properties table
                    query = """
                    INSERT INTO raw_properties (
                        job_id, address, city, state, zip, owner_name,
                        owner_address, owner_city, owner_state, owner_zip,
                        property_value, year_built, sqft, lot_size, beds, baths,
                        property_type, raw_data
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                    """
                    await db_client.execute(
                        query,
                        job_id,
                        result.get('address'),
                        result.get('city'),
                        result.get('state'),
                        result.get('zip'),
                        result.get('owner_name'),
                        result.get('owner_address'),
                        result.get('owner_city'),
                        result.get('owner_state'),
                        result.get('owner_zip'),
                        result.get('property_value'),
                        result.get('year_built'),
                        result.get('sqft'),
                        result.get('lot_size'),
                        result.get('beds'),
                        result.get('baths'),
                        result.get('property_type'),
                        result
                    )
                    records_succeeded += 1
                
                elif job_type == "contractor" and result:
                    # Store in raw_contractors table
                    query = """
                    INSERT INTO raw_contractors (
                        job_id, company_name, owner_name, address, city, state, zip,
                        phone, email, website, license_number, years_in_business,
                        services, certifications, raw_data
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    """
                    await db_client.execute(
                        query,
                        job_id,
                        result.get('company_name'),
                        result.get('owner_name'),
                        result.get('address'),
                        result.get('city'),
                        result.get('state'),
                        result.get('zip'),
                        result.get('phone'),
                        result.get('email'),
                        result.get('website'),
                        result.get('license_number'),
                        result.get('years_in_business'),
                        result.get('services', []),
                        result.get('certifications', []),
                        result
                    )
                    records_succeeded += 1
                    
            except Exception as e:
                logger.error(f"Failed to store result: {e}")
                records_failed += 1
        
        # Update job as completed
        await db_client.update_scraping_job(
            job_id, 
            "completed",
            len(urls),
            records_succeeded,
            records_failed
        )
        
        logger.info(f"✅ Job {job_id} completed: {records_succeeded} succeeded, {records_failed} failed")
        
    except Exception as e:
        logger.error(f"❌ Job {job_id} failed: {e}")
        await db_client.update_scraping_job(job_id, "failed", error_message=str(e))

# Create scraping job
@app.post("/jobs", response_model=JobStatus)
async def create_job(request: JobRequest, background_tasks: BackgroundTasks):
    """Create a new scraping job"""
    try:
        # Create job in database
        job_id = await db_client.insert_scraping_job(
            request.job_type,
            request.city,
            request.state,
            request.metadata
        )
        
        # Start background processing
        urls = [str(url) for url in request.urls]
        background_tasks.add_task(
            process_scraping_job,
            job_id,
            request.job_type,
            request.city,
            request.state,
            urls,
            request.metadata
        )
        
        logger.info(f"Created job {job_id} for {request.city}, {request.state}")
        
        return JobStatus(
            id=job_id,
            status="pending",
            progress={
                "urls_total": len(request.urls),
                "urls_processed": 0,
                "records_found": 0
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to create job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create job: {e}")

# Get job status
@app.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get status of a scraping job"""
    try:
        query = """
        SELECT status, records_processed, records_succeeded, records_failed, error_message
        FROM scraping_jobs WHERE id = $1
        """
        job = await db_client.fetch_one(query, job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return JobStatus(
            id=job_id,
            status=job['status'],
            progress={
                "records_processed": job['records_processed'],
                "records_succeeded": job['records_succeeded'], 
                "records_failed": job['records_failed'],
                "error_message": job['error_message']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {e}")

# List recent jobs
@app.get("/jobs")
async def list_jobs(limit: int = 20, status: Optional[str] = None):
    """List recent scraping jobs"""
    try:
        base_query = """
        SELECT id, job_type, city, state, status, records_processed, 
               records_succeeded, records_failed, created_at, completed_at
        FROM scraping_jobs
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8011)
