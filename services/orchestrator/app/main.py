"""
Orchestrator Service - Coordinates all data acquisition workflows
Port: 8009
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import asyncio
from datetime import datetime, timedelta
import json
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import our modules
import sys
sys.path.append('../../..')
from shared.database import db_client
from shared.redis_client import redis_client
from app.workflows.city_processor import CityProcessor
from app.scheduling.job_scheduler import JobScheduler
from app.monitoring.health_monitor import HealthMonitor

# FastAPI app
app = FastAPI(
    title="Orchestrator Service", 
    description="Central coordination for data acquisition workflows",
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

# Pydantic models
class CityRequest(BaseModel):
    city: str
    state: str
    priority: int = 1  # 1=high, 2=medium, 3=low
    scrape_types: List[str] = ["permit", "property", "contractor"]
    
class WorkflowRequest(BaseModel):
    workflow_type: str  # daily_scrape, enrichment_batch, lead_generation
    cities: List[CityRequest] = []
    parameters: Dict[str, Any] = {}

class SystemStatus(BaseModel):
    overall_health: str
    services: Dict[str, Dict[str, Any]]
    active_workflows: int
    pending_jobs: int

class JobScheduleRequest(BaseModel):
    job_id: str
    job_name: str
    job_type: str  # scraping, enrichment, lead_generation, image_processing, ml_analysis
    cron_expression: str  # e.g., "0 2 * * *" for daily at 2 AM
    enabled: bool = True
    parameters: Dict[str, Any] = {}
    cities: List[str] = []  # Optional city filter

class JobScheduleResponse(BaseModel):
    job_id: str
    job_name: str
    job_type: str
    cron_expression: str
    enabled: bool
    next_run_time: Optional[str] = None
    last_run_time: Optional[str] = None
    parameters: Dict[str, Any] = {}

class JobScheduleUpdate(BaseModel):
    job_name: Optional[str] = None
    cron_expression: Optional[str] = None
    enabled: Optional[bool] = None
    parameters: Optional[Dict[str, Any]] = None
    cities: Optional[List[str]] = None

# Initialize services  
city_processor = CityProcessor()
job_scheduler = JobScheduler()
health_monitor = HealthMonitor()

# Global scheduler
scheduler = AsyncIOScheduler()

# Service endpoints for inter-service communication
SERVICE_URLS = {
    'scraper': 'http://scraper-service:8002',
    'enrichment': 'http://enrichment-service:8004', 
    'lead_generator': 'http://lead-generator:8008'
}

# Startup event
@app.on_event("startup")
async def startup():
    """Initialize connections and start scheduler"""
    try:
        await db_client.connect()
        await redis_client.connect()
        
        # Start the background scheduler
        scheduler.start()
        
        # Schedule daily workflows
        await schedule_daily_workflows()
        
        logger.info("✅ Orchestrator Service started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to start Orchestrator Service: {e}")
        raise

@app.on_event("shutdown")
async def shutdown():
    """Clean up connections and stop scheduler"""
    try:
        scheduler.shutdown()
        await db_client.disconnect()
        await redis_client.disconnect()
        logger.info("✅ Orchestrator Service shut down cleanly")
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

async def schedule_daily_workflows():
    """Schedule daily automated workflows"""
    try:
        # Schedule daily scraping at 2 AM
        scheduler.add_job(
            run_daily_scraping_workflow,
            CronTrigger(hour=2, minute=0),
            id='daily_scraping',
            replace_existing=True
        )
        
        # Schedule enrichment processing every 4 hours
        scheduler.add_job(
            run_enrichment_workflow,
            CronTrigger(minute=0, hour='*/4'),
            id='enrichment_processing',
            replace_existing=True
        )
        
        # Schedule lead generation every 2 hours
        scheduler.add_job(
            run_lead_generation_workflow,
            CronTrigger(minute=0, hour='*/2'), 
            id='lead_generation',
            replace_existing=True
        )
        
        # Schedule health monitoring every 15 minutes
        scheduler.add_job(
            run_health_monitoring,
            CronTrigger(minute='*/15'),
            id='health_monitoring',
            replace_existing=True
        )
        
        logger.info("✅ Scheduled all daily workflows")
        
    except Exception as e:
        logger.error(f"❌ Failed to schedule workflows: {e}")

# Health check
@app.get("/health")
async def health_check():
    """Comprehensive health check for entire system"""
    try:
        system_health = await health_monitor.check_system_health()
        
        return {
            "status": "healthy" if system_health['overall_healthy'] else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "system_health": system_health,
            "scheduler_running": scheduler.running,
            "active_jobs": len(scheduler.get_jobs())
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {e}")

# Get system status
@app.get("/status", response_model=SystemStatus)
async def get_system_status():
    """Get comprehensive system status"""
    try:
        # Check service health
        service_health = await health_monitor.check_all_services()
        
        # Get active workflow count
        active_workflows = await redis_client.llen("active_workflows")
        
        # Get pending jobs count
        pending_jobs_query = "SELECT COUNT(*) as count FROM scraping_jobs WHERE status = 'pending'"
        pending_result = await db_client.fetch_one(pending_jobs_query)
        pending_jobs = pending_result['count'] if pending_result else 0
        
        # Determine overall health
        healthy_services = sum(1 for service in service_health.values() if service.get('healthy', False))
        overall_health = "healthy" if healthy_services >= len(service_health) * 0.8 else "degraded"
        
        return SystemStatus(
            overall_health=overall_health,
            services=service_health,
            active_workflows=active_workflows,
            pending_jobs=pending_jobs
        )
        
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {e}")

# Process single city
@app.post("/cities/process")
async def process_city(request: CityRequest):
    """Process a single city through the complete workflow"""
    try:
        logger.info(f"Processing city: {request.city}, {request.state}")
        
        workflow_id = f"city_{request.city}_{request.state}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Add to active workflows
        await redis_client.lpush("active_workflows", workflow_id)
        
        # Process the city
        result = await city_processor.process_city(
            request.city,
            request.state, 
            request.scrape_types,
            request.priority
        )
        
        # Remove from active workflows
        await redis_client.lpop("active_workflows")  # Simple implementation
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "city": request.city,
            "state": request.state,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"City processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")

# Run workflow
@app.post("/workflows/run")
async def run_workflow(request: WorkflowRequest, background_tasks: BackgroundTasks):
    """Run a specific workflow"""
    try:
        workflow_id = f"{request.workflow_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if request.workflow_type == "daily_scrape":
            background_tasks.add_task(run_daily_scraping_workflow)
        elif request.workflow_type == "enrichment_batch":
            background_tasks.add_task(run_enrichment_workflow)
        elif request.workflow_type == "lead_generation":
            background_tasks.add_task(run_lead_generation_workflow)
        elif request.workflow_type == "city_batch":
            background_tasks.add_task(run_city_batch_workflow, request.cities)
        else:
            raise HTTPException(status_code=400, detail="Invalid workflow type")
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "workflow_type": request.workflow_type,
            "message": "Workflow started successfully"
        }
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Workflow failed: {e}")

# Configurable Job Scheduling Endpoints
@app.post("/scheduler/jobs", response_model=JobScheduleResponse)
async def create_scheduled_job(request: JobScheduleRequest):
    """Create a new scheduled job with configurable timing"""
    try:
        # Validate cron expression
        from apscheduler.triggers.cron import CronTrigger
        try:
            CronTrigger.from_crontab(request.cron_expression)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid cron expression: {e}")
        
        # Store job configuration in database
        job_config = {
            "job_id": request.job_id,
            "job_name": request.job_name,
            "job_type": request.job_type,
            "cron_expression": request.cron_expression,
            "enabled": request.enabled,
            "parameters": json.dumps(request.parameters),
            "cities": request.cities,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        # Insert into job_schedules table (we'll create this table)
        await db_client.execute("""
            INSERT INTO job_schedules (job_id, job_name, job_type, cron_expression, enabled, parameters, cities, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (job_id) DO UPDATE SET
            job_name = $2, cron_expression = $4, enabled = $5, parameters = $6, cities = $7, updated_at = $9
        """, request.job_id, request.job_name, request.job_type, request.cron_expression, 
             request.enabled, json.dumps(request.parameters), request.cities, datetime.now(), datetime.now())
        
        # Schedule the job if enabled
        if request.enabled:
            await schedule_user_job(request)
        
        # Get next run time
        next_run = None
        if request.enabled and request.job_id in [job.id for job in scheduler.get_jobs()]:
            job = scheduler.get_job(request.job_id)
            next_run = job.next_run_time.isoformat() if job.next_run_time else None
        
        return JobScheduleResponse(
            job_id=request.job_id,
            job_name=request.job_name,
            job_type=request.job_type,
            cron_expression=request.cron_expression,
            enabled=request.enabled,
            next_run_time=next_run,
            parameters=request.parameters
        )
        
    except Exception as e:
        logger.error(f"Failed to create scheduled job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create job: {e}")

@app.get("/scheduler/jobs", response_model=List[JobScheduleResponse])
async def get_scheduled_jobs():
    """Get all scheduled jobs"""
    try:
        jobs = await db_client.fetch_all("""
            SELECT job_id, job_name, job_type, cron_expression, enabled, parameters, cities, updated_at
            FROM job_schedules ORDER BY updated_at DESC
        """)
        
        response = []
        for job_record in jobs:
            # Get next run time from scheduler
            next_run = None
            last_run = None
            
            if job_record['enabled']:
                scheduled_job = scheduler.get_job(job_record['job_id'])
                if scheduled_job:
                    next_run = scheduled_job.next_run_time.isoformat() if scheduled_job.next_run_time else None
            
            response.append(JobScheduleResponse(
                job_id=job_record['job_id'],
                job_name=job_record['job_name'],
                job_type=job_record['job_type'],
                cron_expression=job_record['cron_expression'],
                enabled=job_record['enabled'],
                next_run_time=next_run,
                last_run_time=last_run,
                parameters=json.loads(job_record['parameters']) if job_record['parameters'] else {}
            ))
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to get scheduled jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get jobs: {e}")

@app.put("/scheduler/jobs/{job_id}", response_model=JobScheduleResponse)
async def update_scheduled_job(job_id: str, request: JobScheduleUpdate):
    """Update an existing scheduled job"""
    try:
        # Get current job
        current_job = await db_client.fetch_one("""
            SELECT * FROM job_schedules WHERE job_id = $1
        """, job_id)
        
        if not current_job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Update fields
        updates = {}
        if request.job_name is not None:
            updates['job_name'] = request.job_name
        if request.cron_expression is not None:
            # Validate cron expression
            try:
                CronTrigger.from_crontab(request.cron_expression)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid cron expression: {e}")
            updates['cron_expression'] = request.cron_expression
        if request.enabled is not None:
            updates['enabled'] = request.enabled
        if request.parameters is not None:
            updates['parameters'] = json.dumps(request.parameters)
        if request.cities is not None:
            updates['cities'] = request.cities
        
        # Update database
        if updates:
            set_clause = ", ".join([f"{k} = ${i+2}" for i, k in enumerate(updates.keys())])
            values = [job_id] + list(updates.values()) + [datetime.now()]
            
            await db_client.execute(f"""
                UPDATE job_schedules SET {set_clause}, updated_at = ${len(updates)+2}
                WHERE job_id = $1
            """, *values)
        
        # Update scheduler
        updated_job = await db_client.fetch_one("""
            SELECT * FROM job_schedules WHERE job_id = $1
        """, job_id)
        
        # Remove old job from scheduler
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
        
        # Add updated job if enabled
        if updated_job['enabled']:
            job_request = JobScheduleRequest(
                job_id=updated_job['job_id'],
                job_name=updated_job['job_name'],
                job_type=updated_job['job_type'],
                cron_expression=updated_job['cron_expression'],
                enabled=updated_job['enabled'],
                parameters=json.loads(updated_job['parameters']) if updated_job['parameters'] else {},
                cities=updated_job['cities'] or []
            )
            await schedule_user_job(job_request)
        
        # Get next run time
        next_run = None
        if updated_job['enabled']:
            job = scheduler.get_job(job_id)
            next_run = job.next_run_time.isoformat() if job and job.next_run_time else None
        
        return JobScheduleResponse(
            job_id=updated_job['job_id'],
            job_name=updated_job['job_name'],
            job_type=updated_job['job_type'],
            cron_expression=updated_job['cron_expression'],
            enabled=updated_job['enabled'],
            next_run_time=next_run,
            parameters=json.loads(updated_job['parameters']) if updated_job['parameters'] else {}
        )
        
    except Exception as e:
        logger.error(f"Failed to update scheduled job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update job: {e}")

@app.delete("/scheduler/jobs/{job_id}")
async def delete_scheduled_job(job_id: str):
    """Delete a scheduled job"""
    try:
        # Remove from scheduler
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
        
        # Remove from database
        result = await db_client.execute("""
            DELETE FROM job_schedules WHERE job_id = $1
        """, job_id)
        
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"success": True, "message": f"Job {job_id} deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete scheduled job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete job: {e}")

@app.post("/scheduler/jobs/{job_id}/run")
async def run_scheduled_job_now(job_id: str):
    """Run a scheduled job immediately"""
    try:
        # Get job configuration
        job_config = await db_client.fetch_one("""
            SELECT * FROM job_schedules WHERE job_id = $1
        """, job_id)
        
        if not job_config:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Execute the job based on its type
        await execute_user_job(job_config)
        
        return {"success": True, "message": f"Job {job_id} executed successfully"}
        
    except Exception as e:
        logger.error(f"Failed to run scheduled job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to run job: {e}")

async def schedule_user_job(request: JobScheduleRequest):
    """Schedule a user-defined job in the scheduler"""
    try:
        trigger = CronTrigger.from_crontab(request.cron_expression)
        
        scheduler.add_job(
            execute_user_job_wrapper,
            trigger=trigger,
            id=request.job_id,
            args=[request.__dict__],
            replace_existing=True
        )
        
        logger.info(f"✅ Scheduled user job: {request.job_name} ({request.job_id})")
        
    except Exception as e:
        logger.error(f"Failed to schedule job {request.job_id}: {e}")
        raise

async def execute_user_job_wrapper(job_config_dict):
    """Wrapper to execute user-defined jobs"""
    try:
        await execute_user_job(job_config_dict)
    except Exception as e:
        logger.error(f"User job execution failed: {e}")

async def execute_user_job(job_config):
    """Execute a user-defined job based on its type"""
    try:
        job_type = job_config.get('job_type')
        job_id = job_config.get('job_id')
        parameters = job_config.get('parameters', {})
        cities = job_config.get('cities', [])
        
        logger.info(f"🚀 Executing user job: {job_id} ({job_type})")
        
        if job_type == "scraping":
            await run_user_scraping_job(cities, parameters)
        elif job_type == "enrichment":
            await run_user_enrichment_job(cities, parameters)
        elif job_type == "lead_generation":
            await run_user_lead_generation_job(cities, parameters)
        elif job_type == "image_processing":
            await run_user_image_processing_job(cities, parameters)
        elif job_type == "ml_analysis":
            await run_user_ml_analysis_job(cities, parameters)
        else:
            logger.warning(f"Unknown job type: {job_type}")
        
        logger.info(f"✅ User job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"User job execution failed: {e}")
        raise

async def run_user_scraping_job(cities, parameters):
    """Execute user-defined scraping job"""
    if not cities:
        # Run for all active cities
        await run_daily_scraping_workflow()
    else:
        # Run for specific cities
        for city_state in cities:
            city, state = city_state.split(",")
            await city_processor.process_city(
                city.strip(), 
                state.strip(),
                parameters.get("scrape_types", ["permit", "property"]),
                parameters.get("priority", 2)
            )

async def run_user_enrichment_job(cities, parameters):
    """Execute user-defined enrichment job"""
    await run_enrichment_workflow()

async def run_user_lead_generation_job(cities, parameters):
    """Execute user-defined lead generation job"""
    await run_lead_generation_workflow()

async def run_user_image_processing_job(cities, parameters):
    """Execute user-defined image processing job"""
    # Call image processor service for batch processing
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://image-processor:8012/images/batch/process",
                json=parameters
            )
            logger.info(f"Image processing job result: {response.status_code}")
        except Exception as e:
            logger.error(f"Image processing job failed: {e}")

async def run_user_ml_analysis_job(cities, parameters):
    """Execute user-defined ML analysis job"""
    # Call ML inference service for batch analysis
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://ml-inference:8013/analyze/batch",
                json=parameters
            )
            logger.info(f"ML analysis job result: {response.status_code}")
        except Exception as e:
            logger.error(f"ML analysis job failed: {e}")

# Background workflow functions
async def run_daily_scraping_workflow():
    """Daily scraping workflow for all configured cities"""
    try:
        logger.info("🚀 Starting daily scraping workflow")
        
        # Get list of cities to process
        cities_query = """
        SELECT DISTINCT city, state, COUNT(*) as property_count
        FROM raw_properties
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY city, state
        ORDER BY property_count DESC
        LIMIT 20
        """
        
        cities = await db_client.fetch_all(cities_query)
        
        if not cities:
            # Use default cities if none found
            cities = [
                {'city': 'Austin', 'state': 'TX'},
                {'city': 'Dallas', 'state': 'TX'},
                {'city': 'Houston', 'state': 'TX'},
                {'city': 'San Antonio', 'state': 'TX'}
            ]
        
        total_processed = 0
        for city_data in cities:
            try:
                result = await city_processor.process_city(
                    city_data['city'],
                    city_data['state'],
                    ["permit", "property"],
                    priority=2  # Medium priority for automated runs
                )
                total_processed += result.get('properties_processed', 0)
                
                # Add delay between cities to avoid overwhelming servers
                await asyncio.sleep(60)
                
            except Exception as e:
                logger.error(f"Failed to process {city_data['city']}, {city_data['state']}: {e}")
        
        logger.info(f"✅ Daily scraping workflow completed. Processed {total_processed} properties.")
        
    except Exception as e:
        logger.error(f"❌ Daily scraping workflow failed: {e}")

async def run_enrichment_workflow():
    """Enrichment workflow for unprocessed properties"""
    try:
        logger.info("🔍 Starting enrichment workflow")
        
        # Get unprocessed properties (limit batch size)
        unprocessed_query = """
        SELECT p.id, p.address, p.city, p.state, p.owner_name
        FROM raw_properties p
        LEFT JOIN enrichment_jobs e ON e.source_id = p.id AND e.status = 'completed'
        WHERE e.id IS NULL AND p.processed = FALSE
        ORDER BY p.created_at DESC
        LIMIT 100
        """
        
        properties = await db_client.fetch_all(unprocessed_query)
        
        if not properties:
            logger.info("No properties need enrichment")
            return
        
        # Create enrichment jobs via Enrichment Service API
        async with httpx.AsyncClient() as client:
            enrichment_url = f"{SERVICE_URLS['enrichment']}/enrich/batch"
            response = await client.post(
                enrichment_url,
                params={
                    'source_table': 'raw_properties',
                    'enrichment_types': ['email_lookup', 'address_validation', 'property_enrichment'],
                    'limit': len(properties)
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Enrichment workflow queued {result.get('records_queued', 0)} properties")
            else:
                logger.error(f"Enrichment service error: {response.status_code}")
                
    except Exception as e:
        logger.error(f"❌ Enrichment workflow failed: {e}")

async def run_lead_generation_workflow():
    """Lead generation workflow for enriched properties"""
    try:
        logger.info("📊 Starting lead generation workflow")
        
        # Trigger background scoring for unscored properties
        async with httpx.AsyncClient() as client:
            scoring_url = f"{SERVICE_URLS['lead_generator']}/score/background"
            response = await client.post(scoring_url)
            
            if response.status_code == 200:
                logger.info("✅ Lead scoring workflow triggered")
            else:
                logger.error(f"Lead generator service error: {response.status_code}")
        
        # Create clusters for major cities
        major_cities = [
            {'city': 'Austin', 'state': 'TX'},
            {'city': 'Dallas', 'state': 'TX'},
            {'city': 'Houston', 'state': 'TX'}
        ]
        
        for city_data in major_cities:
            try:
                cluster_url = f"{SERVICE_URLS['lead_generator']}/cluster"
                cluster_request = {
                    'city': city_data['city'],
                    'state': city_data['state'],
                    'max_cluster_radius_miles': 3.0,
                    'min_cluster_size': 5
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(cluster_url, json=cluster_request)
                    
                    if response.status_code == 200:
                        result = response.json()
                        cluster_count = len(result.get('clusters', []))
                        logger.info(f"Created {cluster_count} clusters for {city_data['city']}")
                    
            except Exception as e:
                logger.error(f"Clustering failed for {city_data['city']}: {e}")
                
    except Exception as e:
        logger.error(f"❌ Lead generation workflow failed: {e}")

async def run_city_batch_workflow(cities: List[CityRequest]):
    """Process multiple cities in batch"""
    try:
        logger.info(f"🏙️  Processing {len(cities)} cities in batch")
        
        for city_request in cities:
            try:
                await city_processor.process_city(
                    city_request.city,
                    city_request.state,
                    city_request.scrape_types,
                    city_request.priority
                )
                
                # Add delay between cities
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"Failed to process {city_request.city}: {e}")
        
        logger.info("✅ City batch workflow completed")
        
    except Exception as e:
        logger.error(f"❌ City batch workflow failed: {e}")

async def run_health_monitoring():
    """Health monitoring workflow"""
    try:
        health_status = await health_monitor.check_system_health()
        
        # Store health metrics in database
        await db_client.execute("""
            INSERT INTO system_health (service_name, health_check, status, metadata)
            VALUES ('orchestrator', 'system_health', $1, $2)
        """, 
            'healthy' if health_status['overall_healthy'] else 'degraded',
            json.dumps(health_status)
        )
        
        # Log any unhealthy services
        for service, status in health_status['services'].items():
            if not status.get('healthy', True):
                logger.warning(f"⚠️  Service {service} is unhealthy: {status}")
                
    except Exception as e:
        logger.error(f"❌ Health monitoring failed: {e}")

# Get workflow history
@app.get("/workflows/history")
async def get_workflow_history(limit: int = 50):
    """Get recent workflow execution history"""
    try:
        # Get recent scraping jobs as proxy for workflow history
        history_query = """
        SELECT job_type, city, state, status, records_processed, 
               records_succeeded, records_failed, created_at, completed_at
        FROM scraping_jobs
        ORDER BY created_at DESC
        LIMIT $1
        """
        
        workflows = await db_client.fetch_all(history_query, limit)
        
        return {
            "workflows": workflows,
            "count": len(workflows)
        }
        
    except Exception as e:
        logger.error(f"Failed to get workflow history: {e}")
        raise HTTPException(status_code=500, detail=f"History retrieval failed: {e}")

# Get performance metrics
@app.get("/metrics")
async def get_metrics():
    """Get system performance metrics"""
    try:
        # Daily processing stats
        daily_stats_query = """
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as total_jobs,
            SUM(records_processed) as total_records,
            SUM(records_succeeded) as successful_records,
            AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_duration_minutes
        FROM scraping_jobs
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND status = 'completed'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        """
        
        daily_stats = await db_client.fetch_all(daily_stats_query)
        
        # Lead generation stats
        lead_stats_query = """
        SELECT 
            COUNT(*) as total_leads,
            AVG(overall_score) as avg_score,
            COUNT(*) FILTER (WHERE overall_score >= 80) as high_quality_leads,
            COUNT(*) FILTER (WHERE pricing_tier = 'premium') as premium_leads
        FROM lead_scores
        WHERE created_at >= NOW() - INTERVAL '7 days'
        """
        
        lead_stats = await db_client.fetch_one(lead_stats_query)
        
        return {
            "daily_processing": daily_stats,
            "lead_generation": lead_stats,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Metrics retrieval failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)