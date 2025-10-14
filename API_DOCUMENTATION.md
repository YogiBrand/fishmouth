# Fish Mouth - Comprehensive API Documentation

**Version 3.0** | AI-Powered Roofing Lead Generation Platform  
**Base URL**: `http://localhost:8000` (Development) | `https://your-domain.com` (Production)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Core Services](#core-services)
   - [Lead Generation Service](#lead-generation-service-port-8000)
   - [Voice Agent Service](#voice-agent-service-port-8000)
   - [Sequence Automation Service](#sequence-automation-service-port-8000)
   - [AI Voice Router](#ai-voice-router)
   - [Dashboard Service](#dashboard-service)
   - [Webhook Handlers](#webhook-handlers)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limits](#rate-limits)
7. [Integration Examples](#integration-examples)

---

## Overview

Fish Mouth provides a comprehensive API for AI-powered roofing lead generation, including property scanning, roof analysis, lead scoring, voice automation, and sequence management. The system uses Claude Vision for roof analysis, Telnyx for voice/SMS delivery, and advanced scoring algorithms.

### Key Features
- **AI Roof Detection**: Claude Vision analyzes aerial imagery
- **Lead Scoring**: 0-100 scoring with quality-based pricing
- **Voice Automation**: AI-powered calling with real-time streaming
- **Sequence Management**: Multi-channel automation (Email, SMS, Voice)
- **Real-time Analytics**: Performance tracking and insights

---

## Authentication

All API endpoints require JWT authentication via Bearer token.

### Sign Up
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "contractor@example.com",
  "password": "secure_password",
  "company_name": "ABC Roofing",
  "phone": "+15551234567"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "contractor@example.com",
    "company_name": "ABC Roofing",
    "role": "user"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "contractor@example.com",
  "password": "secure_password"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer {token}
```

---

## Core Services

## Lead Generation Service (Port 8000)

### Estimate Scan Cost
```http
POST /api/scan/estimate
Authorization: Bearer {token}
Content-Type: application/json

{
  "area_name": "Miami, FL",
  "scan_type": "city",
  "latitude": 25.7617,
  "longitude": -80.1918,
  "radius_miles": 2.0,
  "property_cap": 500
}
```

**Response:**
```json
{
  "estimated_properties": 450,
  "estimated_properties_before_cap": 660,
  "estimated_cost": 157.50,
  "cost_breakdown": {
    "imagery": 67.50,
    "street_view": 42.00,
    "data_enrichment": 33.00,
    "processing": 15.00
  },
  "warnings": [],
  "suggested_radius": null
}
```

### Start Area Scan
```http
POST /api/scan/area
Authorization: Bearer {token}
Content-Type: application/json

{
  "area_name": "Miami Beach, FL",
  "scan_type": "city",
  "latitude": 25.7907,
  "longitude": -80.1300,
  "radius_miles": 1.5,
  "estimated_cost": 125.75,
  "property_cap": 300
}
```

**Response:**
```json
{
  "id": 123,
  "area_name": "Miami Beach, FL",
  "scan_type": "city",
  "status": "queued",
  "total_properties": 0,
  "processed_properties": 0,
  "qualified_leads": 0,
  "progress_percentage": 0.0,
  "results_summary": null,
  "scan_parameters": {
    "latitude": 25.7907,
    "longitude": -80.1300,
    "radius_miles": 1.5,
    "estimated_cost": 125.75,
    "property_cap": 300
  },
  "created_at": "2025-01-14T10:30:00Z",
  "started_at": null,
  "completed_at": null
}
```

### Get Scan Status
```http
GET /api/scan/{scan_id}/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 123,
  "area_name": "Miami Beach, FL",
  "scan_type": "city",
  "status": "in_progress",
  "total_properties": 287,
  "processed_properties": 45,
  "qualified_leads": 12,
  "progress_percentage": 15.7,
  "results_summary": null,
  "scan_parameters": {...},
  "created_at": "2025-01-14T10:30:00Z",
  "started_at": "2025-01-14T10:35:00Z",
  "completed_at": null
}
```

### Get Scan Results (Leads)
```http
GET /api/scan/{scan_id}/results
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 456,
    "address": "123 Ocean Drive",
    "city": "Miami Beach",
    "state": "FL",
    "zip_code": "33139",
    "roof_age_years": 18,
    "roof_condition_score": 72.5,
    "roof_material": "asphalt_shingle",
    "roof_size_sqft": 2400,
    "aerial_image_url": "https://storage.example.com/images/roof_123.jpg",
    "lead_score": 87.2,
    "priority": "hot",
    "replacement_urgency": "urgent",
    "damage_indicators": ["granule_loss", "missing_shingles", "moss_growth"],
    "discovery_status": "mapbox",
    "imagery_status": "satellite",
    "property_enrichment_status": "estated",
    "contact_enrichment_status": "truepeoplesearch",
    "homeowner_name": "John Smith",
    "homeowner_phone": "+15551234567",
    "homeowner_email": "john.smith@email.com",
    "property_value": 485000,
    "estimated_value": 29100.00,
    "conversion_probability": 92.5,
    "ai_analysis": {
      "summary": "Urgent roof replacement needed. Multiple damage indicators present.",
      "imagery": {
        "source": "mapbox_satellite",
        "captured_at": "2024-12-15T14:20:00Z",
        "quality_score": 94.2,
        "quality_status": "passed"
      },
      "score_breakdown": {
        "condition": 35.28,
        "age": 15.00,
        "property_value": 12.75,
        "damage_indicators": 7.50,
        "contact_confidence": 6.67
      }
    },
    "area_scan_id": 123,
    "status": "new",
    "created_at": "2025-01-14T11:45:00Z",
    "voice_opt_out": false,
    "last_voice_contacted": null
  }
]
```

### Get All Leads (Filtered)
```http
GET /api/leads?priority=hot&status=new&min_score=80&limit=25
Authorization: Bearer {token}
```

**Query Parameters:**
- `priority`: `hot`, `warm`, `cold`
- `status`: `new`, `contacted`, `qualified`, `closed_won`, `closed_lost`
- `min_score`, `max_score`: Filter by lead score
- `area_scan_id`: Filter by specific scan
- `limit`: Results per page (default: 50, max: 200)

### Get Single Lead
```http
GET /api/leads/{lead_id}
Authorization: Bearer {token}
```

### Update Lead
```http
PUT /api/leads/{lead_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "qualified",
  "notes": "Called and scheduled inspection for tomorrow",
  "tags": ["hot_lead", "inspection_scheduled"]
}
```

### Export Leads to CSV
```http
GET /api/leads/export?priority=hot&min_score=75
Authorization: Bearer {token}
```

**Response:** CSV file download with columns:
- lead_id, address, city, state, zip_code, lead_score, priority
- roof_age_years, roof_condition_score, replacement_urgency
- homeowner_name, homeowner_phone, homeowner_email
- property_value, estimated_value, conversion_probability
- damage_indicators, created_at

### Get Lead Activities
```http
GET /api/activities?lead_id={lead_id}&limit=50
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 789,
    "lead_id": 456,
    "activity_type": "scan_lead_created",
    "title": "New AI-qualified lead",
    "description": "Urgent roof replacement needed. Multiple damage indicators present.",
    "metadata": {
      "score": 87.2,
      "priority": "hot",
      "imagery_source": "mapbox_satellite",
      "heatmap_url": "https://storage.example.com/heatmaps/roof_123.jpg"
    },
    "created_at": "2025-01-14T11:45:00Z"
  }
]
```

---

## Voice Agent Service (Port 8000)

### Start Voice Call
```http
POST /api/voice/calls/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "lead_id": 456,
  "config": {
    "max_duration_minutes": 10,
    "enable_barge_in": true,
    "voice_id": "21m00Tcm4TlvDq8ikWAM"
  }
}
```

**Response:**
```json
{
  "call_id": "call_abc123",
  "status": "initiated"
}
```

### Get Voice Call Details
```http
GET /api/voice/calls/{call_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "call_abc123",
  "lead_id": 456,
  "status": "completed",
  "duration_seconds": 180,
  "outcome": "scheduled",
  "interest_level": "high",
  "appointment_scheduled": true,
  "recording_url": "https://storage.example.com/recordings/call_abc123.mp3",
  "transcript_json": {
    "turns": [
      {
        "role": "assistant",
        "text": "Hi John, this is Sarah from Fish Mouth Roofing. We detected urgent issues on your roof and wanted to offer a free inspection.",
        "audio_url": "https://storage.example.com/audio/turn_1.mp3"
      },
      {
        "role": "user",
        "text": "Oh really? What kind of issues did you find?",
        "audio_url": null
      }
    ]
  },
  "conversation_state": "completed",
  "first_audio_latency_ms": 1250,
  "ai_summary": "Homeowner interested in free inspection. Scheduled for tomorrow 2pm.",
  "next_steps": "Follow up with inspection confirmation email",
  "total_cost": 0.54,
  "ai_cost": 0.12,
  "carrier": "telnyx",
  "call_control_id": "v3:T02llQxVyaOlsdEXdrPyXnPG4QlpL2t6j",
  "created_at": "2025-01-14T14:30:00Z",
  "ended_at": "2025-01-14T14:33:00Z"
}
```

### List Voice Calls
```http
GET /api/voice/calls?lead_id=456&status=completed&limit=25
Authorization: Bearer {token}
```

**Query Parameters:**
- `lead_id`: Filter by specific lead
- `status`: `in_progress`, `completed`, `failed`
- `outcome`: `scheduled`, `follow_up`, `not_interested`, `voicemail`
- `interest_level`: `high`, `medium`, `low`
- `search`: Search by phone number, call ID, or homeowner name
- `limit`: Results per page (default: 50)

### End Voice Call
```http
POST /api/voice/calls/{call_id}/end?outcome=completed
Authorization: Bearer {token}
```

### Voice Analytics
```http
GET /api/voice/analytics/daily?days=30
Authorization: Bearer {token}
```

**Response:**
```json
{
  "total_calls": 145,
  "total_connects": 89,
  "total_bookings": 23,
  "avg_booking_rate": 25.8,
  "avg_duration_seconds": 165,
  "avg_latency_ms": 1180,
  "total_call_cost_usd": 26.10,
  "total_ai_cost_usd": 8.70,
  "daily_breakdown": [
    {
      "day": "2025-01-14",
      "calls": 12,
      "connects": 8,
      "bookings": 3,
      "booking_rate": 37.5
    }
  ],
  "outcome_breakdown": [
    {
      "outcome": "scheduled",
      "count": 23,
      "sentiment": 85.2
    },
    {
      "outcome": "follow_up",
      "count": 34,
      "sentiment": 72.1
    }
  ],
  "sentiment_trends": [
    {
      "day": "2025-01-14",
      "avg_sentiment": 78.5
    }
  ],
  "insights": {
    "strengths": ["Booking rate is trending strong—keep current pitch"],
    "risks": [],
    "recommendations": ["Consider increasing daily call volume"]
  }
}
```

### Voice Configuration
```http
GET /api/voice/config
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 1,
  "default_voice_id": "21m00Tcm4TlvDq8ikWAM",
  "tts_vendor": "elevenlabs",
  "voice_style": "professional",
  "asr_vendor": "deepgram",
  "asr_language": "en-US",
  "llm_vendor": "openai",
  "llm_model": "gpt-4",
  "max_call_duration_minutes": 15,
  "enable_barge_in": true,
  "require_consent": false,
  "enable_recording": true
}
```

### Update Voice Configuration
```http
PUT /api/voice/config
Authorization: Bearer {token}
Content-Type: application/json

{
  "default_voice_id": "pNInz6obpgDQGcFmaJgB",
  "max_call_duration_minutes": 12,
  "enable_barge_in": false
}
```

---

## Sequence Automation Service (Port 8000)

### List Sequences
```http
GET /api/sequences
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Hot Lead Follow-up",
    "description": "Aggressive 5-day follow-up for leads with 80+ scores",
    "is_active": true,
    "is_template": false,
    "total_enrolled": 45,
    "total_completed": 23,
    "total_converted": 8,
    "conversion_rate": 17.8,
    "flow_data": {
      "nodes": [...],
      "edges": [...]
    },
    "created_at": "2025-01-10T09:00:00Z",
    "updated_at": "2025-01-12T15:30:00Z"
  }
]
```

### Create Sequence from Template
```http
POST /api/sequences
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Miami Hot Lead Campaign",
  "description": "Customized follow-up for Miami market",
  "template_name": "hot_lead_followup"
}
```

### Create Blank Sequence
```http
POST /api/sequences
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Custom Sequence",
  "description": "Custom automation flow"
}
```

### Get Sequence Details
```http
GET /api/sequences/{sequence_id}
Authorization: Bearer {token}
```

### Update Sequence
```http
PUT /api/sequences/{sequence_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Sequence Name",
  "is_active": true,
  "flow_data": {
    "nodes": [
      {
        "id": "start",
        "type": "start",
        "position": {"x": 100, "y": 100},
        "data": {"label": "Start"}
      },
      {
        "id": "email_1",
        "type": "email",
        "position": {"x": 300, "y": 100},
        "data": {
          "label": "Welcome Email",
          "delay_days": 0,
          "delay_hours": 0,
          "subject": "About your roof analysis",
          "use_ai_writer": true,
          "ai_prompt": "Send welcoming email about roof findings"
        }
      }
    ],
    "edges": [
      {"id": "e1", "source": "start", "target": "email_1"}
    ]
  }
}
```

### Enroll Leads in Sequence
```http
POST /api/sequences/{sequence_id}/enroll
Authorization: Bearer {token}
Content-Type: application/json

{
  "lead_ids": [456, 789, 012]
}
```

**Response:**
```json
{
  "enrolled_count": 2,
  "error_count": 1,
  "enrollments": [
    {"lead_id": 456, "enrollment_id": 101, "status": "enrolled"},
    {"lead_id": 789, "enrollment_id": 102, "status": "enrolled"}
  ],
  "errors": [
    {"lead_id": 012, "error": "Lead already enrolled in this sequence"}
  ]
}
```

### Manage Enrollment
```http
PUT /api/sequences/enrollments/{enrollment_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "pause",
  "notes": "Customer requested temporary hold"
}
```

**Available actions:**
- `pause`: Pause sequence execution
- `resume`: Resume paused sequence
- `cancel`: Cancel enrollment completely
- `mark_converted`: Mark as successfully converted
- `mark_failed`: Mark as failed/unresponsive

### Sequence Performance
```http
GET /api/sequences/{sequence_id}/performance
Authorization: Bearer {token}
```

**Response:**
```json
{
  "sequence_id": 1,
  "name": "Hot Lead Follow-up",
  "total_enrolled": 45,
  "active_enrollments": 12,
  "completed_enrollments": 23,
  "converted_enrollments": 8,
  "conversion_rate": 17.8,
  "completion_rate": 51.1,
  "avg_completion_time_hours": 72,
  "best_performing_node": "voice_call",
  "drop_off_points": ["sms_1", "email_1"]
}
```

### Available Templates
```http
GET /api/sequences/templates
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "name": "hot_lead_followup",
    "display_name": "Hot Lead Follow-up",
    "description": "Aggressive 5-day follow-up for leads with 80+ scores",
    "category": "conversion",
    "estimated_duration_days": 5,
    "node_count": 9
  },
  {
    "name": "warm_lead_nurture",
    "display_name": "Warm Lead Nurture",
    "description": "Educational 7-day sequence for warm prospects",
    "category": "nurturing",
    "estimated_duration_days": 7,
    "node_count": 7
  },
  {
    "name": "cold_lead_revival",
    "display_name": "Cold Lead Revival",
    "description": "Re-engagement sequence for cold leads",
    "category": "reactivation",
    "estimated_duration_days": 14,
    "node_count": 5
  }
]
```

### Trigger Manual Processing
```http
POST /api/sequences/process
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": "scheduled"
}
```

---

## AI Voice Router

### Launch Voice Campaign
```http
POST /api/v1/ai-voice/campaign
Content-Type: application/json

{
  "lead_ids": ["456", "789", "012"],
  "contractor_id": "contractor_123",
  "campaign_name": "Miami Beach Outreach"
}
```

### Schedule Follow-up
```http
POST /api/v1/ai-voice/follow-up
Content-Type: application/json

{
  "lead_id": "456",
  "sequence_type": "no_answer"
}
```

**Response:**
```json
{
  "status": "queued"
}
```

---

## Dashboard Service

### Dashboard Overview
```http
GET /api/v1/dashboard/stats
```

**Response:**
```json
{
  "total_leads": 1250,
  "hot_leads": 180,
  "warm_leads": 420,
  "cold_leads": 650,
  "conversion_rate": 12.5,
  "active_campaigns": 8,
  "revenue_this_month": 45000
}
```

### Active Clusters
```http
GET /api/v1/dashboard/active-clusters?limit=25
```

### Recent Activity
```http
GET /api/v1/dashboard/activity?limit=15
```

### Hot Leads Dashboard
```http
GET /api/v1/dashboard/hot-leads?min_score=80&limit=50
```

---

## Webhook Handlers

### Telnyx SMS Webhook
```http
POST /api/v1/webhooks/telnyx/sms
Telnyx-Signature-Ed25519: {signature}
Telnyx-Timestamp: {timestamp}
Content-Type: application/json

{
  "data": {
    "event_type": "message.delivered",
    "payload": {
      "id": "msg_123",
      "status": "delivered"
    }
  }
}
```

### Telnyx Call Webhook
```http
POST /api/v1/webhooks/telnyx/call
Telnyx-Signature-Ed25519: {signature}
Telnyx-Timestamp: {timestamp}
Content-Type: application/json

{
  "data": {
    "event_type": "call.answered",
    "payload": {
      "call_control_id": "v3:T02llQxVyaOlsdEXdrPyXnPG4QlpL2t6j",
      "duration_secs": 120
    }
  }
}
```

---

## Data Models

### Lead Model
```json
{
  "id": 456,
  "address": "123 Ocean Drive",
  "city": "Miami Beach",
  "state": "FL",
  "zip_code": "33139",
  "latitude": 25.7907,
  "longitude": -80.1300,
  "roof_age_years": 18,
  "roof_condition_score": 72.5,
  "roof_material": "asphalt_shingle",
  "roof_size_sqft": 2400,
  "lead_score": 87.2,
  "priority": "hot|warm|cold",
  "status": "new|contacted|qualified|closed_won|closed_lost",
  "replacement_urgency": "urgent|moderate|low",
  "damage_indicators": ["granule_loss", "missing_shingles"],
  "homeowner_name": "John Smith",
  "homeowner_phone": "+15551234567",
  "homeowner_email": "john@example.com",
  "property_value": 485000,
  "estimated_value": 29100.00,
  "conversion_probability": 92.5,
  "voice_opt_out": false,
  "created_at": "2025-01-14T11:45:00Z"
}
```

### Voice Call Model
```json
{
  "id": "call_abc123",
  "lead_id": 456,
  "user_id": 1,
  "status": "in_progress|completed|failed",
  "outcome": "scheduled|follow_up|not_interested|voicemail",
  "interest_level": "high|medium|low",
  "duration_seconds": 180,
  "appointment_scheduled": true,
  "total_cost": 0.54,
  "ai_cost": 0.12,
  "carrier": "telnyx",
  "created_at": "2025-01-14T14:30:00Z"
}
```

### Sequence Model
```json
{
  "id": 1,
  "name": "Hot Lead Follow-up",
  "description": "5-day aggressive follow-up",
  "is_active": true,
  "total_enrolled": 45,
  "total_completed": 23,
  "total_converted": 8,
  "conversion_rate": 17.8,
  "flow_data": {
    "nodes": [...],
    "edges": [...]
  }
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "detail": "Error description",
  "status_code": 400,
  "timestamp": "2025-01-14T15:30:00Z",
  "path": "/api/leads/456"
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid token
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `422`: Unprocessable Entity - Validation error
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

---

## Rate Limits

- **Lead Generation**: 10 scans per hour per user
- **Voice Calls**: 100 calls per hour per user
- **API Requests**: 1000 requests per hour per user
- **Sequence Processing**: 500 enrollments per hour per user

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642176000
```

---

## Integration Examples

### Basic Lead Generation Flow
```javascript
// 1. Estimate scan cost
const estimate = await fetch('/api/scan/estimate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    area_name: 'Miami, FL',
    radius_miles: 2.0,
    property_cap: 500
  })
});

// 2. Start scan if cost acceptable
const scan = await fetch('/api/scan/area', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    area_name: 'Miami, FL',
    radius_miles: 2.0,
    estimated_cost: estimate.estimated_cost
  })
});

// 3. Monitor progress via WebSocket
const ws = new WebSocket(`ws://localhost:8000/ws/scans/${scan.id}`);
ws.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log(`Progress: ${progress.progress_percentage}%`);
};

// 4. Get results when complete
const leads = await fetch(`/api/scan/${scan.id}/results`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Voice Call Automation
```javascript
// Start voice call
const call = await fetch('/api/voice/calls/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    lead_id: 456,
    config: {
      max_duration_minutes: 10,
      enable_barge_in: true
    }
  })
});

// Monitor call status
const callDetails = await fetch(`/api/voice/calls/${call.call_id}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Sequence Enrollment
```javascript
// Create sequence from template
const sequence = await fetch('/api/sequences', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Miami Hot Lead Campaign',
    template_name: 'hot_lead_followup'
  })
});

// Enroll leads
const enrollment = await fetch(`/api/sequences/${sequence.id}/enroll`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    lead_ids: [456, 789, 012]
  })
});
```

---

## Real-time Features

### WebSocket Connections

#### Scan Progress
```javascript
const ws = new WebSocket(`ws://localhost:8000/ws/scans/${scanId}`);
```

#### Activity Feed
```javascript
const ws = new WebSocket(`ws://localhost:8000/ws/activity`);
```

#### Voice Streaming
```javascript
const ws = new WebSocket(`ws://localhost:8000/api/voice/stream/${callId}`);
```

---

**For complete API documentation and interactive testing, visit: `http://localhost:8000/docs`**

**Support:** dev@fishmouth.com | **Version:** 3.0 | **Last Updated:** January 2025