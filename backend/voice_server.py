"""
AI Voice Server - Standalone voice service for Fish Mouth
Port: 8001
"""
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import asyncio
import json
import os
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Simple Voice Agent Mock (for now)
class AIVoiceAgentService:
    """Mock AI Voice Agent Service"""
    
    async def create_call_campaign(self, lead_ids, contractor_id, campaign_name=""):
        """Create a call campaign"""
        return {
            "campaign_id": f"camp_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "lead_ids": lead_ids,
            "contractor_id": contractor_id,
            "campaign_name": campaign_name,
            "status": "created",
            "calls_scheduled": len(lead_ids)
        }
    
    async def send_followup_sequence(self, lead_id, sequence_type="no_answer"):
        """Send follow-up sequence"""
        return {
            "lead_id": lead_id,
            "sequence_type": sequence_type,
            "status": "scheduled"
        }
    
    async def make_immediate_call(self, phone_number, lead_id=None, contractor_id=None, script_template="default"):
        """Make immediate call"""
        return {
            "call_id": f"call_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "phone_number": phone_number,
            "lead_id": lead_id,
            "contractor_id": contractor_id,
            "status": "initiated"
        }
    
    async def list_campaigns(self):
        """List campaigns"""
        return [
            {
                "campaign_id": "camp_20241014_080000",
                "campaign_name": "Neighborhood Outreach",
                "status": "active",
                "calls_made": 25,
                "calls_scheduled": 50,
                "created_at": datetime.now().isoformat()
            }
        ]
    
    async def get_campaign_details(self, campaign_id):
        """Get campaign details"""
        return {
            "campaign_id": campaign_id,
            "campaign_name": "Neighborhood Outreach",
            "status": "active",
            "calls_made": 25,
            "calls_scheduled": 50,
            "success_rate": 0.32,
            "created_at": datetime.now().isoformat()
        }
    
    async def list_calls(self, limit=50, status=None):
        """List calls"""
        return [
            {
                "call_id": "call_20241014_080001",
                "phone_number": "+1234567890",
                "status": "completed",
                "duration": 120,
                "outcome": "interested",
                "created_at": datetime.now().isoformat()
            }
        ]
    
    async def get_call_details(self, call_id):
        """Get call details"""
        return {
            "call_id": call_id,
            "phone_number": "+1234567890",
            "status": "completed",
            "duration": 120,
            "outcome": "interested",
            "transcript": "Hello, this is regarding your roof inspection...",
            "created_at": datetime.now().isoformat()
        }
    
    async def process_audio_chunk(self, call_id, audio_data):
        """Process audio chunk"""
        return {"status": "processed", "call_id": call_id}
    
    async def start_call_stream(self, call_id):
        """Start call stream"""
        return {"status": "started", "call_id": call_id}
    
    async def end_call_stream(self, call_id):
        """End call stream"""
        return {"status": "ended", "call_id": call_id}

# FastAPI app
app = FastAPI(
    title="Fish Mouth AI Voice Service",
    description="AI-powered voice calling and communication service",
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
class CampaignRequest(BaseModel):
    lead_ids: List[str]
    contractor_id: str
    campaign_name: Optional[str] = "Neighborhood Outreach"

class FollowUpRequest(BaseModel):
    lead_id: str
    sequence_type: Optional[str] = "no_answer"

class CallRequest(BaseModel):
    phone_number: str
    lead_id: Optional[str] = None
    contractor_id: Optional[str] = None
    script_template: Optional[str] = "default"

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "ai-voice-server",
            "port": 8001
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {e}")

# Campaign management
@app.post("/api/v1/ai-voice/campaign")
async def launch_campaign(request: CampaignRequest):
    """Launch AI voice campaign"""
    try:
        if not request.lead_ids or not request.contractor_id:
            raise HTTPException(status_code=400, detail="lead_ids and contractor_id are required")

        service = AIVoiceAgentService()
        result = await service.create_call_campaign(
            request.lead_ids, 
            request.contractor_id, 
            campaign_name=request.campaign_name
        )
        return result
    except Exception as e:
        logger.error(f"Campaign launch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Campaign launch failed: {e}")

@app.post("/api/v1/ai-voice/follow-up")
async def schedule_follow_up(request: FollowUpRequest):
    """Schedule AI voice follow-up"""
    try:
        if not request.lead_id:
            raise HTTPException(status_code=400, detail="lead_id is required")

        service = AIVoiceAgentService()
        await service.send_followup_sequence(request.lead_id, sequence_type=request.sequence_type)
        return {"status": "queued", "lead_id": request.lead_id}
    except Exception as e:
        logger.error(f"Follow-up scheduling failed: {e}")
        raise HTTPException(status_code=500, detail=f"Follow-up scheduling failed: {e}")

@app.post("/api/v1/ai-voice/call")
async def make_call(request: CallRequest):
    """Make immediate AI voice call"""
    try:
        service = AIVoiceAgentService()
        result = await service.make_immediate_call(
            request.phone_number,
            lead_id=request.lead_id,
            contractor_id=request.contractor_id,
            script_template=request.script_template
        )
        return result
    except Exception as e:
        logger.error(f"Call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Call failed: {e}")

@app.get("/api/v1/ai-voice/campaigns")
async def list_campaigns():
    """List AI voice campaigns"""
    try:
        service = AIVoiceAgentService()
        campaigns = await service.list_campaigns()
        return {"campaigns": campaigns}
    except Exception as e:
        logger.error(f"Failed to list campaigns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list campaigns: {e}")

@app.get("/api/v1/ai-voice/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    """Get campaign details"""
    try:
        service = AIVoiceAgentService()
        campaign = await service.get_campaign_details(campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return campaign
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get campaign: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get campaign: {e}")

@app.get("/api/v1/ai-voice/calls")
async def list_calls(limit: int = 50, status: Optional[str] = None):
    """List recent calls"""
    try:
        service = AIVoiceAgentService()
        calls = await service.list_calls(limit=limit, status=status)
        return {"calls": calls}
    except Exception as e:
        logger.error(f"Failed to list calls: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list calls: {e}")

@app.get("/api/v1/ai-voice/calls/{call_id}")
async def get_call(call_id: str):
    """Get call details including transcript"""
    try:
        service = AIVoiceAgentService()
        call = await service.get_call_details(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        return call
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get call: {e}")

@app.websocket("/ws/voice-stream/{call_id}")
async def voice_stream(websocket: WebSocket, call_id: str):
    """WebSocket for real-time voice streaming"""
    await websocket.accept()
    try:
        service = AIVoiceAgentService()
        
        while True:
            # Handle real-time voice data
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "audio":
                # Process audio chunk
                response = await service.process_audio_chunk(call_id, message["data"])
                await websocket.send_text(json.dumps(response))
            elif message["type"] == "start_call":
                # Start call
                response = await service.start_call_stream(call_id)
                await websocket.send_text(json.dumps(response))
            elif message["type"] == "end_call":
                # End call
                response = await service.end_call_stream(call_id)
                await websocket.send_text(json.dumps(response))
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for call {call_id}")
    except Exception as e:
        logger.error(f"WebSocket error for call {call_id}: {e}")
        await websocket.send_text(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)