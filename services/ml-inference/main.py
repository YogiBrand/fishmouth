"""
ML Inference Service - Port 8013
Provides AI-powered roof analysis, damage detection, and classification
"""
import os
import sys
import uuid
import asyncio
import joblib
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
import asyncpg
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel

import structlog
import cv2
from PIL import Image
import torch
import torch.nn.functional as F
from torchvision import transforms
from ultralytics import YOLO

# Add shared directory to path
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from shared.observability import RequestContextMiddleware, setup_observability
from database import DatabaseClient
from redis_client import RedisClient

SERVICE_NAME = "ml-inference"
setup_observability(SERVICE_NAME)
logger = structlog.get_logger(SERVICE_NAME)

app = FastAPI(title="ML Inference Service", version="1.0.0")
app.add_middleware(RequestContextMiddleware, service_name=SERVICE_NAME)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://fishmouth:fishmouth123@localhost:5432/fishmouth")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Global clients and models
db_client = None
redis_client = None
models = {}

# Pydantic models
class PropertyAnalysisRequest(BaseModel):
    property_id: str

class ImageAnalysisRequest(BaseModel):
    image_id: str
    models: Optional[List[str]] = ["classifier", "detector", "segmentor"]

class ValidationRequest(BaseModel):
    property_id: str
    prediction: Dict[str, Any]

class ApprovalRequest(BaseModel):
    validation_id: str
    approved: bool
    notes: Optional[str] = ""

# Mock ML Models
class MockRoofClassifier:
    """Mock roof condition classifier"""
    
    def __init__(self):
        self.classes = ["excellent", "good", "fair", "poor", "critical"]
        self.model_version = "v1.0"
    
    def predict(self, image):
        """Mock prediction - in production would be real CNN"""
        # Simulate analysis based on image properties
        height, width = image.shape[:2]
        mean_intensity = np.mean(image)
        
        # Mock logic for demonstration
        if mean_intensity > 180:
            condition = "excellent"
            confidence = 0.92
        elif mean_intensity > 140:
            condition = "good" 
            confidence = 0.87
        elif mean_intensity > 100:
            condition = "fair"
            confidence = 0.79
        elif mean_intensity > 60:
            condition = "poor"
            confidence = 0.81
        else:
            condition = "critical"
            confidence = 0.88
        
        return {
            "condition": condition,
            "confidence": confidence,
            "details": {
                "mean_intensity": float(mean_intensity),
                "image_size": f"{width}x{height}"
            }
        }

class MockDamageDetector:
    """Mock damage detection model"""
    
    def __init__(self):
        self.damage_types = [
            "missing_shingles", "cracked_tiles", "moss_growth", 
            "rust_stains", "gutter_damage", "flashing_issues"
        ]
        self.model_version = "v1.2"
    
    def detect(self, image):
        """Mock damage detection"""
        height, width = image.shape[:2]
        
        # Mock detection results
        detections = []
        damage_found = np.random.random() > 0.4  # 60% chance of finding damage
        
        if damage_found:
            num_damages = np.random.randint(1, 4)
            for i in range(num_damages):
                damage_type = np.random.choice(self.damage_types)
                x = np.random.randint(0, width//2)
                y = np.random.randint(0, height//2)
                w = np.random.randint(50, width//4)
                h = np.random.randint(50, height//4)
                confidence = 0.6 + np.random.random() * 0.3
                
                detections.append({
                    "damage_type": damage_type,
                    "bbox": {"x": x, "y": y, "w": w, "h": h},
                    "confidence": float(confidence),
                    "severity": np.random.randint(1, 5)
                })
        
        return {
            "damage_detected": damage_found,
            "detections": detections,
            "total_damages": len(detections)
        }

class MockRoofSegmentor:
    """Mock roof segmentation model"""
    
    def __init__(self):
        self.model_version = "v1.1"
    
    def segment(self, image):
        """Mock roof segmentation"""
        height, width = image.shape[:2]
        
        # Mock segmentation results
        total_pixels = height * width
        roof_pixels = int(total_pixels * (0.6 + np.random.random() * 0.3))
        roof_sqft = int(roof_pixels * 0.1)  # Mock conversion to sqft
        
        return {
            "roof_area_pixels": roof_pixels,
            "roof_area_sqft": roof_sqft,
            "roof_percentage": float(roof_pixels / total_pixels),
            "roof_type": np.random.choice(["asphalt_shingle", "tile", "metal", "flat"])
        }

# Initialize models on startup
async def load_models():
    """Load ML models (mock implementations)"""
    global models
    models = {
        "classifier": MockRoofClassifier(),
        "detector": MockDamageDetector(),
        "segmentor": MockRoofSegmentor()
    }
    logger.info("models.loaded", count=len(models))

# Startup and shutdown events
@app.on_event("startup")
async def startup():
    global db_client, redis_client
    db_client = DatabaseClient()
    await db_client.connect()
    redis_client = RedisClient()
    await redis_client.connect()
    await load_models()
    logger.info("startup.success")

@app.on_event("shutdown")
async def shutdown():
    if db_client:
        await db_client.close()
    if redis_client:
        await redis_client.close()
    logger.info("shutdown.success")

@app.get("/healthz")
async def healthz():
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/readyz")
async def readyz():
    """Readiness check ensuring downstream dependencies are reachable."""
    try:
        # Check database connection
        await db_client.execute("SELECT 1")
        # Check Redis connection
        await redis_client.ping()
        
        return {
            "status": "healthy",
            "service": SERVICE_NAME,
            "port": 8013,
            "database": "connected",
            "redis": "connected",
            "models_loaded": len(models),
            "available_models": list(models.keys())
        }
    except Exception as e:
        logger.error("readyz.failed", error=str(e))
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/health")
async def legacy_health():
    return await readyz()

@app.post("/analyze/property")
async def analyze_property(request: PropertyAnalysisRequest, background_tasks: BackgroundTasks):
    """Analyze all images for a property"""
    try:
        # Get property images
        images = await db_client.fetch_all("""
            SELECT id, s3_key, image_type, view_angle
            FROM property_images 
            WHERE property_id = $1 AND usable_for_analysis = true
            ORDER BY quality_score DESC
        """, request.property_id)
        
        if not images:
            raise HTTPException(status_code=404, detail="No usable images found for property")
        
        # Queue analysis
        background_tasks.add_task(process_property_analysis, request.property_id, images)
        
        return {
            "success": True,
            "message": "Property analysis queued",
            "property_id": request.property_id,
            "images_to_analyze": len(images)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_property_analysis(property_id: str, images: List[dict]):
    """Process comprehensive property analysis"""
    try:
        all_results = {
            "classifications": [],
            "detections": [],
            "segmentations": [],
            "overall_analysis": {}
        }
        
        for image_record in images:
            image_path = Path(image_record['s3_key'])
            if not image_path.exists():
                continue
            
            # Load image
            image = cv2.imread(str(image_path))
            if image is None:
                continue
            
            # Run all models
            classification_result = models["classifier"].predict(image)
            detection_result = models["detector"].detect(image)  
            segmentation_result = models["segmentor"].segment(image)
            
            all_results["classifications"].append({
                "image_id": image_record["id"],
                "view_angle": image_record["view_angle"],
                **classification_result
            })
            
            all_results["detections"].append({
                "image_id": image_record["id"],
                "view_angle": image_record["view_angle"],
                **detection_result
            })
            
            all_results["segmentations"].append({
                "image_id": image_record["id"],
                "view_angle": image_record["view_angle"],
                **segmentation_result
            })
        
        # Aggregate results for overall analysis
        overall_analysis = aggregate_analysis_results(all_results)
        
        # Save to database
        await save_roof_analysis(property_id, overall_analysis, all_results)
        
    logger.info("analysis.completed", property_id=property_id)
        
    except Exception as e:
        logger.error("analysis.failed", property_id=property_id, error=str(e))

def aggregate_analysis_results(results: Dict) -> Dict:
    """Aggregate analysis results from multiple images"""
    classifications = results["classifications"]
    detections = results["detections"]
    segmentations = results["segmentations"]
    
    # Determine overall condition (worst case from all images)
    condition_hierarchy = {"excellent": 5, "good": 4, "fair": 3, "poor": 2, "critical": 1}
    worst_condition = "excellent"
    total_confidence = 0
    
    for classification in classifications:
        condition = classification["condition"]
        confidence = classification["confidence"]
        total_confidence += confidence
        
        if condition_hierarchy[condition] < condition_hierarchy[worst_condition]:
            worst_condition = condition
    
    avg_confidence = total_confidence / len(classifications) if classifications else 0
    
    # Aggregate damage information
    all_damage_types = set()
    total_damages = 0
    damage_severities = {}
    
    for detection in detections:
        if detection["damage_detected"]:
            total_damages += detection["total_damages"]
            for damage_det in detection["detections"]:
                damage_type = damage_det["damage_type"]
                all_damage_types.add(damage_type)
                if damage_type not in damage_severities:
                    damage_severities[damage_type] = []
                damage_severities[damage_type].append(damage_det["severity"])
    
    # Calculate average roof area
    total_roof_sqft = sum(seg["roof_area_sqft"] for seg in segmentations)
    avg_roof_sqft = total_roof_sqft // len(segmentations) if segmentations else 0
    
    # Estimate costs based on condition and damage
    repair_cost_base = 5000
    replacement_cost_base = 15000
    
    condition_multipliers = {"excellent": 0.1, "good": 0.5, "fair": 1.0, "poor": 1.5, "critical": 2.0}
    multiplier = condition_multipliers.get(worst_condition, 1.0)
    
    repair_cost_low = int(repair_cost_base * multiplier)
    repair_cost_high = int(repair_cost_low * 1.5)
    replacement_cost_low = int(replacement_cost_base + (avg_roof_sqft * 8))
    replacement_cost_high = int(replacement_cost_low * 1.3)
    
    return {
        "overall_condition": worst_condition,
        "confidence_score": round(avg_confidence, 2),
        "damage_detected": total_damages > 0,
        "damage_types": list(all_damage_types),
        "damage_severity": {dt: sum(severities)/len(severities) for dt, severities in damage_severities.items()},
        "roof_sqft": avg_roof_sqft,
        "estimated_age": np.random.randint(5, 25),  # Mock
        "estimated_remaining_life": np.random.randint(10, 30),  # Mock
        "repair_cost_low": repair_cost_low,
        "repair_cost_high": repair_cost_high,
        "replacement_cost_low": replacement_cost_low,
        "replacement_cost_high": replacement_cost_high,
        "roi_for_replacement": round(np.random.uniform(15, 35), 1)
    }

async def save_roof_analysis(property_id: str, overall_analysis: Dict, detailed_results: Dict):
    """Save roof analysis results to database"""
    try:
        analysis_id = str(uuid.uuid4())
        
        await db_client.execute("""
            INSERT INTO roof_analysis (
                id, property_id, overall_condition, confidence_score,
                damage_detected, damage_types, damage_severity,
                roof_sqft, roof_type, estimated_age, estimated_remaining_life,
                repair_cost_low, repair_cost_high, replacement_cost_low, replacement_cost_high,
                roi_for_replacement, classifier_model, classifier_version,
                detector_model, detector_version, segmentor_model, segmentor_version,
                validation_status, analyzed_at, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
            )
        """, 
        analysis_id, property_id, overall_analysis["overall_condition"], 
        overall_analysis["confidence_score"], overall_analysis["damage_detected"],
        overall_analysis["damage_types"], overall_analysis["damage_severity"],
        overall_analysis["roof_sqft"], "asphalt_shingle", overall_analysis["estimated_age"],
        overall_analysis["estimated_remaining_life"], overall_analysis["repair_cost_low"],
        overall_analysis["repair_cost_high"], overall_analysis["replacement_cost_low"],
        overall_analysis["replacement_cost_high"], overall_analysis["roi_for_replacement"],
        "mock_classifier", models["classifier"].model_version,
        "mock_detector", models["detector"].model_version,
        "mock_segmentor", models["segmentor"].model_version,
        "pending", datetime.now(), datetime.now())
        
        logger.info("analysis.saved", property_id=property_id, analysis_id=str(analysis_id))
        
    except Exception as e:
        logger.error("analysis.persist_failed", error=str(e))

@app.post("/analyze/image")
async def analyze_single_image(request: ImageAnalysisRequest):
    """Analyze a single image"""
    try:
        # Get image info
        image_record = await db_client.fetch_one("""
            SELECT property_id, s3_key, image_type, view_angle
            FROM property_images WHERE id = $1
        """, request.image_id)
        
        if not image_record:
            raise HTTPException(status_code=404, detail="Image not found")
        
        image_path = Path(image_record['s3_key'])
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        
        # Load image
        image = cv2.imread(str(image_path))
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Run requested models
        results = {}
        for model_name in request.models:
            if model_name == "classifier":
                results["classification"] = models["classifier"].predict(image)
            elif model_name == "detector":
                results["detection"] = models["detector"].detect(image)
            elif model_name == "segmentor":
                results["segmentation"] = models["segmentor"].segment(image)
        
        return {
            "success": True,
            "image_id": request.image_id,
            "property_id": image_record["property_id"],
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_models():
    """List available ML models"""
    model_info = {}
    for name, model in models.items():
        model_info[name] = {
            "name": name,
            "version": getattr(model, 'model_version', 'unknown'),
            "status": "loaded",
            "type": model.__class__.__name__
        }
    
    return {
        "success": True,
        "models": model_info,
        "total_models": len(models)
    }

@app.get("/models/{model_id}")
async def get_model_info(model_id: str):
    """Get information about a specific model"""
    if model_id not in models:
        raise HTTPException(status_code=404, detail="Model not found")
    
    model = models[model_id]
    return {
        "success": True,
        "model_id": model_id,
        "name": model_id,
        "version": getattr(model, 'model_version', 'unknown'),
        "type": model.__class__.__name__,
        "status": "loaded"
    }

@app.post("/models/{model_id}/reload")
async def reload_model(model_id: str):
    """Reload a specific model"""
    if model_id not in models:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # In production, this would reload the model from disk
    return {
        "success": True,
        "message": f"Model {model_id} reloaded successfully",
        "model_id": model_id
    }

@app.post("/validate/prediction")
async def validate_prediction(request: ValidationRequest):
    """Submit a prediction for human validation"""
    try:
        validation_id = str(uuid.uuid4())
        
        # In a full implementation, this would store validation requests
        # For now, just return success
        return {
            "success": True,
            "validation_id": validation_id,
            "property_id": request.property_id,
            "status": "pending_review"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/validation/pending")
async def get_pending_validations():
    """Get predictions that need human validation"""
    try:
        # Get roof analyses that need validation
        pending = await db_client.fetch_all("""
            SELECT ra.id, ra.property_id, ra.overall_condition, ra.confidence_score,
                   ra.damage_detected, rp.address, rp.city, rp.state
            FROM roof_analysis ra
            JOIN raw_properties rp ON ra.property_id = rp.id
            WHERE ra.validation_status = 'pending'
            ORDER BY ra.created_at DESC
            LIMIT 50
        """)
        
        return {
            "success": True,
            "pending_validations": [dict(p) for p in pending],
            "count": len(pending)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/validation/{validation_id}/approve")
async def approve_prediction(validation_id: str, request: ApprovalRequest):
    """Approve or reject a prediction"""
    try:
        status = "approved" if request.approved else "needs_review"
        
        await db_client.execute("""
            UPDATE roof_analysis 
            SET validation_status = $1, human_validated = true, 
                validation_notes = $2, validation_date = $3
            WHERE id = $4
        """, status, request.notes, datetime.now(), validation_id)
        
        return {
            "success": True,
            "validation_id": validation_id,
            "status": status,
            "approved": request.approved
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analysis/property/{property_id}")
async def get_property_analysis(property_id: str):
    """Get roof analysis results for a property"""
    try:
        analysis = await db_client.fetch_one("""
            SELECT * FROM roof_analysis 
            WHERE property_id = $1 
            ORDER BY analyzed_at DESC 
            LIMIT 1
        """, property_id)
        
        if not analysis:
            raise HTTPException(status_code=404, detail="No analysis found for property")
        
        return {
            "success": True,
            "property_id": property_id,
            "analysis": dict(analysis)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_service_stats():
    """Get service statistics"""
    try:
        stats = await db_client.fetch_one("""
            SELECT 
                COUNT(*) as total_analyses,
                COUNT(*) FILTER (WHERE validation_status = 'approved') as approved_analyses,
                COUNT(*) FILTER (WHERE damage_detected = true) as properties_with_damage,
                AVG(confidence_score) as avg_confidence,
                COUNT(DISTINCT property_id) as properties_analyzed
            FROM roof_analysis
        """)
        
        return {
            "success": True,
            "service": "ml-inference",
            "port": 8013,
            "models_loaded": len(models),
            "stats": dict(stats) if stats else {}
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8013)
