"""
Lead Generator Service - Lead scoring, clustering, and packaging
Port: 8008
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import json

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
from app.scoring.lead_scorer import LeadScorer
from app.clustering.geo_clusterer import GeoClusterer
from app.triggers.trigger_detector import TriggerDetector

# FastAPI app
app = FastAPI(
    title="Lead Generator Service",
    description="Lead scoring, clustering, and packaging for roofing contractors",
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
class LeadScoringRequest(BaseModel):
    property_id: str
    
class BatchScoringRequest(BaseModel):
    property_ids: List[str]
    
class ClusteringRequest(BaseModel):
    city: str
    state: str
    max_cluster_radius_miles: float = 2.0
    min_cluster_size: int = 3

class LeadPackageRequest(BaseModel):
    cluster_id: str
    pricing_tier: str = "standard"  # premium, standard, budget
    
class LeadScore(BaseModel):
    property_id: str
    overall_score: int
    component_scores: Dict[str, int]
    buying_signals: List[str]
    triggers: List[str]
    pricing_tier: str
    estimated_price: float

# Initialize services
lead_scorer = LeadScorer()
geo_clusterer = GeoClusterer()
trigger_detector = TriggerDetector()

# Startup event
@app.on_event("startup")
async def startup():
    """Initialize connections"""
    try:
        await db_client.connect()
        await redis_client.connect()
        logger.info("✅ Lead Generator Service started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to start Lead Generator Service: {e}")
        raise

@app.on_event("shutdown")
async def shutdown():
    """Clean up connections"""
    try:
        await db_client.disconnect()
        await redis_client.disconnect()
        logger.info("✅ Lead Generator Service shut down cleanly")
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
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
                "scorer": "ok",
                "clusterer": "ok",
                "trigger_detector": "ok"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {e}")

# Score single lead
@app.post("/score", response_model=LeadScore)
async def score_lead(request: LeadScoringRequest):
    """Score a single property for lead quality"""
    try:
        logger.info(f"Scoring property {request.property_id}")
        
        # Get property data
        property_query = """
        SELECT p.*, e.result as enrichment_data
        FROM raw_properties p
        LEFT JOIN enrichment_jobs e ON e.source_id = p.id AND e.status = 'completed'
        WHERE p.id = $1
        """
        property_data = await db_client.fetch_one(property_query, request.property_id)
        
        if not property_data:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Parse enrichment data if available
        enrichment_data = {}
        if property_data.get('enrichment_data'):
            try:
                enrichment_data = json.loads(property_data['enrichment_data'])
            except json.JSONDecodeError:
                pass
        
        # Score the lead
        score_result = await lead_scorer.score_property(property_data, enrichment_data)
        
        # Detect triggers
        triggers = await trigger_detector.detect_triggers(property_data, enrichment_data)
        
        # Store score in database
        await db_client.execute("""
            INSERT INTO lead_scores (
                property_id, overall_score, roof_age_score, property_value_score,
                storm_activity_score, neighborhood_score, owner_match_score,
                urgency_score, buying_signals, triggers_detected, pricing_tier, price_per_lead
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (property_id) DO UPDATE SET
            overall_score = EXCLUDED.overall_score,
            roof_age_score = EXCLUDED.roof_age_score,
            property_value_score = EXCLUDED.property_value_score,
            storm_activity_score = EXCLUDED.storm_activity_score,
            neighborhood_score = EXCLUDED.neighborhood_score,
            owner_match_score = EXCLUDED.owner_match_score,
            urgency_score = EXCLUDED.urgency_score,
            buying_signals = EXCLUDED.buying_signals,
            triggers_detected = EXCLUDED.triggers_detected,
            pricing_tier = EXCLUDED.pricing_tier,
            price_per_lead = EXCLUDED.price_per_lead,
            updated_at = NOW()
        """, 
            request.property_id,
            score_result['overall_score'],
            score_result['component_scores'].get('roof_age', 0),
            score_result['component_scores'].get('property_value', 0), 
            score_result['component_scores'].get('storm_activity', 0),
            score_result['component_scores'].get('neighborhood', 0),
            score_result['component_scores'].get('owner_match', 0),
            score_result['component_scores'].get('urgency', 0),
            json.dumps(score_result['buying_signals']),
            json.dumps([t['type'] for t in triggers]),
            score_result['pricing_tier'],
            score_result['estimated_price']
        )
        
        return LeadScore(
            property_id=request.property_id,
            overall_score=score_result['overall_score'],
            component_scores=score_result['component_scores'],
            buying_signals=score_result['buying_signals'],
            triggers=[t['type'] for t in triggers],
            pricing_tier=score_result['pricing_tier'],
            estimated_price=score_result['estimated_price']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lead scoring failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scoring failed: {e}")

# Batch scoring
@app.post("/score/batch")
async def score_leads_batch(request: BatchScoringRequest):
    """Score multiple properties in batch"""
    try:
        logger.info(f"Batch scoring {len(request.property_ids)} properties")
        
        results = []
        failed = 0
        
        for property_id in request.property_ids:
            try:
                # Score individual property
                score_request = LeadScoringRequest(property_id=property_id)
                result = await score_lead(score_request)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to score property {property_id}: {e}")
                failed += 1
        
        return {
            "success": True,
            "results": results,
            "scored": len(results),
            "failed": failed
        }
        
    except Exception as e:
        logger.error(f"Batch scoring failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch scoring failed: {e}")

# Create geographic clusters
@app.post("/cluster")
async def create_clusters(request: ClusteringRequest):
    """Create geographic clusters of properties"""
    try:
        logger.info(f"Clustering properties in {request.city}, {request.state}")
        
        # Get scored properties in the area
        properties_query = """
        SELECT p.id, p.address, p.city, p.state, ls.overall_score,
               COALESCE(e.result::json->>'address'->>'latitude', '0')::float as latitude,
               COALESCE(e.result::json->>'address'->>'longitude', '0')::float as longitude
        FROM raw_properties p
        JOIN lead_scores ls ON ls.property_id = p.id
        LEFT JOIN enrichment_jobs e ON e.source_id = p.id AND e.status = 'completed'
        WHERE p.city ILIKE $1 AND p.state ILIKE $2 
        AND ls.overall_score >= 60
        AND COALESCE(e.result::json->>'address'->>'latitude', '0')::float != 0
        ORDER BY ls.overall_score DESC
        """
        
        properties = await db_client.fetch_all(
            properties_query, 
            f"%{request.city}%", 
            request.state.upper()
        )
        
        if len(properties) < request.min_cluster_size:
            return {
                "success": True,
                "clusters": [],
                "message": f"Not enough qualified properties found (minimum {request.min_cluster_size})"
            }
        
        # Create clusters
        clusters = await geo_clusterer.create_clusters(
            properties,
            max_radius_miles=request.max_cluster_radius_miles,
            min_cluster_size=request.min_cluster_size
        )
        
        return {
            "success": True,
            "clusters": clusters,
            "total_properties": len(properties),
            "clustered_properties": sum(len(c['properties']) for c in clusters)
        }
        
    except Exception as e:
        logger.error(f"Clustering failed: {e}")
        raise HTTPException(status_code=500, detail=f"Clustering failed: {e}")

# Package leads for delivery
@app.post("/package")
async def package_leads(request: LeadPackageRequest):
    """Package clustered leads for contractor delivery"""
    try:
        logger.info(f"Packaging leads for cluster {request.cluster_id}")
        
        # This would create a deliverable lead package
        # Including property details, contact info, scores, etc.
        
        return {
            "success": True,
            "package_id": f"pkg_{request.cluster_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "pricing_tier": request.pricing_tier,
            "message": "Lead package created successfully"
        }
        
    except Exception as e:
        logger.error(f"Lead packaging failed: {e}")
        raise HTTPException(status_code=500, detail=f"Lead packaging failed: {e}")

# Get high-scoring leads
@app.get("/leads/top")
async def get_top_leads(
    limit: int = 50,
    min_score: int = 70,
    city: Optional[str] = None,
    state: Optional[str] = None
):
    """Get top-scoring leads"""
    try:
        base_query = """
        SELECT p.id, p.address, p.city, p.state, p.owner_name,
               ls.overall_score, ls.pricing_tier, ls.price_per_lead,
               ls.buying_signals, ls.triggers_detected
        FROM raw_properties p
        JOIN lead_scores ls ON ls.property_id = p.id
        WHERE ls.overall_score >= $1
        """
        
        params = [min_score]
        param_count = 1
        
        if city:
            param_count += 1
            base_query += f" AND p.city ILIKE ${param_count}"
            params.append(f"%{city}%")
            
        if state:
            param_count += 1
            base_query += f" AND p.state ILIKE ${param_count}"
            params.append(state.upper())
        
        param_count += 1
        base_query += f" ORDER BY ls.overall_score DESC LIMIT ${param_count}"
        params.append(limit)
        
        leads = await db_client.fetch_all(base_query, *params)
        
        # Parse JSON fields
        for lead in leads:
            if lead.get('buying_signals'):
                try:
                    lead['buying_signals'] = json.loads(lead['buying_signals'])
                except:
                    lead['buying_signals'] = []
                    
            if lead.get('triggers_detected'):
                try:
                    lead['triggers_detected'] = json.loads(lead['triggers_detected'])
                except:
                    lead['triggers_detected'] = []
        
        return {
            "leads": leads,
            "count": len(leads),
            "filters": {
                "min_score": min_score,
                "city": city,
                "state": state
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get top leads: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get leads: {e}")

# Process new properties for scoring (background task)
async def process_new_properties_for_scoring():
    """Background task to score newly enriched properties"""
    try:
        # Get properties that have been enriched but not scored
        query = """
        SELECT DISTINCT p.id
        FROM raw_properties p
        JOIN enrichment_jobs e ON e.source_id = p.id AND e.status = 'completed'
        LEFT JOIN lead_scores ls ON ls.property_id = p.id
        WHERE ls.id IS NULL
        LIMIT 100
        """
        
        properties = await db_client.fetch_all(query)
        
        for prop in properties:
            try:
                score_request = LeadScoringRequest(property_id=prop['id'])
                await score_lead(score_request)
                logger.info(f"Auto-scored property {prop['id']}")
            except Exception as e:
                logger.error(f"Auto-scoring failed for {prop['id']}: {e}")
                
    except Exception as e:
        logger.error(f"Background scoring task failed: {e}")

# Endpoint to trigger background scoring
@app.post("/score/background")
async def trigger_background_scoring(background_tasks: BackgroundTasks):
    """Trigger background scoring of unscored properties"""
    background_tasks.add_task(process_new_properties_for_scoring)
    return {"message": "Background scoring task started"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)