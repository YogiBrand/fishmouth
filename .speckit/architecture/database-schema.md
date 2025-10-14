# Database Schema Documentation

## Overview

Fish Mouth uses PostgreSQL 15 as its primary database with 18 production models organized into logical groups:

- **User & Auth** (1 model)
- **Lead Management** (4 models)
- **Sequences** (4 models)
- **Voice System** (5 models)
- **Configuration** (1 model)
- **Admin & Billing** (2 models)
- **Contagion System** (11 models)

## Entity Relationship Diagram

```
users (1) ──────────────┬─────── area_scans (N)
  │                     │
  │                     └─────── leads (N)
  │                              │
  │                              ├─── voice_calls (N)
  │                              ├─── sequence_enrollments (N)
  │                              └─── lead_activities (N)
  │
  ├──────────────────────────── sequences (N)
  │                              │
  │                              ├─── sequence_nodes (N)
  │                              └─── sequence_enrollments (N)
  │                                    │
  │                                    └─── sequence_executions (N)
  │
  ├──────────────────────────── voice_calls (N)
  │                              │
  │                              ├─── voice_call_turns (N)
  │                              ├─── voice_call_events (N)
  │                              └─── voice_bookings (N)
  │
  ├──────────────────────────── voice_configuration (1:1)
  ├──────────────────────────── ai_configuration (1:1)
  ├──────────────────────────── voice_metrics_daily (N)
  ├──────────────────────────── billing_usage (N)
  └──────────────────────────── audit_logs (N)

properties (1) ──────────────┬─── property_scores (N)
  │                          │
  ├────────────────────────  ├─── social_proof_data (1:1)
  │                          ├─── property_reports (N)
  │                          ├─── ai_calls (N)
  │                          ├─── scheduled_sms (N)
  │                          └─── follow_up_tasks (N)
  │
  └── contagion_clusters ────────── property_scores (N)

contractors ──────────────────┬─── property_reports (N)
                              ├─── call_campaigns (N)
                              └─── ai_calls (N)
```

## Model Details

### 1. User & Auth

#### users
Primary user account table with subscription and billing info.

```sql
id                          INTEGER PRIMARY KEY
email                       STRING UNIQUE NOT NULL
hashed_password             STRING NOT NULL
company_name                STRING
phone                       STRING
role                        STRING DEFAULT 'user'  -- user, admin, superadmin
is_active                   BOOLEAN DEFAULT true

-- Profile
full_name                   STRING
business_address            STRING
website                     STRING
business_logo_url           STRING
service_area                JSON  -- Array of cities/zips

-- Subscription & Billing
subscription_tier           STRING DEFAULT 'trial'  -- trial, professional, enterprise
subscription_status         STRING DEFAULT 'active'
trial_leads_remaining       INTEGER DEFAULT 25
monthly_lead_count          INTEGER DEFAULT 0
stripe_customer_id          STRING
stripe_subscription_item_id STRING
stripe_subscription_id      STRING

created_at                  DATETIME
updated_at                  DATETIME

-- Relationships
scans                       → area_scans
leads                       → leads
sequences                   → sequences
voice_calls                 → voice_calls
voice_config                → voice_configurations (1:1)
ai_config                   → ai_configurations (1:1)
```

**Indexes**:
- `email` (unique)
- `id` (primary)

**Business Rules**:
- Email must be unique and validated
- Password must be hashed with bcrypt
- Trial users get 25 free leads
- Role determines admin access

### 2. Lead Management

#### area_scans
Tracks area scanning jobs and progress.

```sql
id                      INTEGER PRIMARY KEY
user_id                 INTEGER FK(users.id)
area_name               STRING NOT NULL  -- "Austin, TX" or "78701"
scan_type               STRING DEFAULT 'city'  -- city, zip_code, custom_area
status                  STRING DEFAULT 'pending'  -- pending, queued, in_progress, completed, failed
total_properties        INTEGER DEFAULT 0
processed_properties    INTEGER DEFAULT 0
qualified_leads         INTEGER DEFAULT 0
progress_percentage     FLOAT DEFAULT 0.0
scan_parameters         JSON  -- {radius: 10, filters: {...}}

-- Results
results_summary         JSON
error_message           TEXT

created_at              DATETIME
started_at              DATETIME
completed_at            DATETIME

-- Relationships
user                    → users
leads                   → leads
```

**Indexes**:
- `user_id`
- `status`
- `created_at`

**Business Rules**:
- Status flow: pending → queued → in_progress → completed/failed
- Progress percentage: 0-100
- Results summary includes counts, top leads, etc.

#### leads
Main lead table with comprehensive property and scoring data.

```sql
id                          INTEGER PRIMARY KEY
user_id                     INTEGER FK(users.id)
area_scan_id                INTEGER FK(area_scans.id)

-- Property Information
address                     STRING NOT NULL
city                        STRING
state                       STRING
zip_code                    STRING
latitude                    FLOAT
longitude                   FLOAT

-- Roof Analysis
roof_age_years              INTEGER
roof_condition_score        FLOAT  -- 0-100
roof_material               STRING
roof_size_sqft              INTEGER
aerial_image_url            STRING
ai_analysis                 JSON  -- Detailed AI analysis
discovery_status            STRING DEFAULT 'completed'  -- completed, failed, pending
imagery_status              STRING DEFAULT 'synthetic'  -- live, synthetic, failed
property_enrichment_status  STRING DEFAULT 'synthetic'  -- live, synthetic, failed
contact_enrichment_status   STRING DEFAULT 'synthetic'  -- live, synthetic, failed

-- Scoring & Classification
lead_score                  FLOAT NOT NULL DEFAULT 0.0  -- 0-100
priority                    ENUM(LeadPriority)  -- HOT, WARM, COLD
replacement_urgency         STRING  -- immediate, urgent, plan_ahead, good_condition
damage_indicators           JSON  -- Array of issues

-- Contact Information (PII)
homeowner_name              STRING
homeowner_email             STRING
homeowner_phone             STRING
homeowner_email_hash        STRING  -- For matching without PII
homeowner_phone_hash        STRING
homeowner_email_encrypted   TEXT  -- Fernet encrypted
homeowner_phone_encrypted   TEXT  -- Fernet encrypted
contact_enriched            BOOLEAN DEFAULT false
contact_enrichment_cost     FLOAT DEFAULT 0.0

-- Voice Consent
voice_opt_out               BOOLEAN DEFAULT false
voice_opt_out_reason        STRING
voice_consent_updated_at    DATETIME
last_voice_contacted        DATETIME

-- Property Data
property_value              INTEGER
year_built                  INTEGER
property_type               STRING
length_of_residence         INTEGER

-- Lead Management
status                      ENUM(LeadStatus)  -- NEW, CONTACTED, QUALIFIED, etc.
tags                        JSON  -- Array of tags
notes                       TEXT
last_contacted              DATETIME
next_follow_up              DATETIME

-- Analytics
cost_to_generate            FLOAT DEFAULT 0.0
estimated_value             FLOAT
conversion_probability      FLOAT  -- 0-100

created_at                  DATETIME
updated_at                  DATETIME

-- Relationships
user                        → users
area_scan                   → area_scans
voice_calls                 → voice_calls
sequence_enrollments        → sequence_enrollments
activities                  → lead_activities
```

**Indexes**:
- `user_id`
- `area_scan_id`
- `city`
- `zip_code`
- `status`
- `priority`
- `lead_score`
- `created_at`

**Enums**:
```python
LeadPriority: HOT, WARM, COLD
LeadStatus: NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, 
            APPOINTMENT_SCHEDULED, CLOSED_WON, CLOSED_LOST
```

**Business Rules**:
- Lead score: 0-100 (weighted algorithm)
- Priority: HOT (80-100), WARM (60-79), COLD (<60)
- Only charge for leads with score >= 60
- PII should be encrypted at rest
- Voice opt-out must be respected (DNC compliance)

#### lead_activities
Activity timeline for each lead.

```sql
id                  INTEGER PRIMARY KEY
lead_id             INTEGER FK(leads.id)
user_id             INTEGER FK(users.id)

activity_type       STRING NOT NULL  -- email_sent, sms_sent, call_made, note_added, status_changed
title               STRING NOT NULL
description         TEXT
activity_metadata   JSON  -- Additional data

success             BOOLEAN DEFAULT true
error_message       TEXT

created_at          DATETIME

-- Relationships
lead                → leads
```

**Indexes**:
- `lead_id`
- `activity_type`
- `created_at`

**Common Activity Types**:
- `email_sent`
- `sms_sent`
- `call_made`
- `call_completed`
- `note_added`
- `status_changed`
- `sequence_enrolled`
- `appointment_scheduled`

### 3. Sequences

#### sequences
Sequence definitions and configuration.

```sql
id                      INTEGER PRIMARY KEY
user_id                 INTEGER FK(users.id)
name                    STRING NOT NULL
description             TEXT
is_active               BOOLEAN DEFAULT true
is_template             BOOLEAN DEFAULT false

-- Configuration
flow_data               JSON  -- React Flow nodes and edges
working_hours_start     STRING DEFAULT '09:00'
working_hours_end       STRING DEFAULT '17:00'
working_days            JSON DEFAULT [1,2,3,4,5]  -- Mon-Fri
timezone                STRING DEFAULT 'America/New_York'

-- Performance Metrics
total_enrolled          INTEGER DEFAULT 0
total_completed         INTEGER DEFAULT 0
total_converted         INTEGER DEFAULT 0
conversion_rate         FLOAT DEFAULT 0.0

created_at              DATETIME
updated_at              DATETIME

-- Relationships
user                    → users
nodes                   → sequence_nodes (CASCADE DELETE)
enrollments             → sequence_enrollments
```

**Indexes**:
- `user_id`
- `is_active`

**Business Rules**:
- Working hours respect timezone
- Flow data stores React Flow structure
- Conversion rate auto-calculated

#### sequence_nodes
Individual nodes in a sequence.

```sql
id                  INTEGER PRIMARY KEY
sequence_id         INTEGER FK(sequences.id)
node_id             STRING NOT NULL  -- React Flow node ID
node_type           ENUM(SequenceNodeType)
position_x          FLOAT DEFAULT 0
position_y          FLOAT DEFAULT 0

-- Configuration
config              JSON  -- Node-specific config
ai_instructions     TEXT  -- Custom AI prompts

-- Connections
next_nodes          JSON  -- Array of next node IDs
condition_rules     JSON  -- For condition nodes

-- Performance
execution_count     INTEGER DEFAULT 0
success_count       INTEGER DEFAULT 0
failure_count       INTEGER DEFAULT 0

created_at          DATETIME

-- Relationships
sequence            → sequences
```

**Enums**:
```python
SequenceNodeType: EMAIL, SMS, VOICE_CALL, WAIT, CONDITION, RESEARCH, START, END
```

**Indexes**:
- `sequence_id`
- `node_type`

#### sequence_enrollments
Tracks leads enrolled in sequences.

```sql
id                      INTEGER PRIMARY KEY
sequence_id             INTEGER FK(sequences.id)
lead_id                 INTEGER FK(leads.id)
user_id                 INTEGER FK(users.id)

-- Status
status                  STRING DEFAULT 'active'  -- active, paused, completed, failed
current_node_id         STRING
steps_completed         INTEGER DEFAULT 0
next_execution_at       DATETIME
last_execution_at       DATETIME
error_message           TEXT
conversion_outcome      STRING

-- Performance
emails_sent             INTEGER DEFAULT 0
sms_sent                INTEGER DEFAULT 0
calls_made              INTEGER DEFAULT 0
emails_opened           INTEGER DEFAULT 0
emails_clicked          INTEGER DEFAULT 0
converted               BOOLEAN DEFAULT false
conversion_date         DATETIME

enrolled_at             DATETIME
completed_at            DATETIME

-- Relationships
sequence                → sequences
lead                    → leads
voice_calls             → voice_calls
executions              → sequence_executions (CASCADE DELETE)
```

**Indexes**:
- `sequence_id`
- `lead_id`
- `status`
- `next_execution_at`

#### sequence_executions
Logs each sequence step execution.

```sql
id                  INTEGER PRIMARY KEY
sequence_id         INTEGER FK(sequences.id)
enrollment_id       INTEGER FK(sequence_enrollments.id)
node_id             STRING NOT NULL
node_type           ENUM(SequenceNodeType)
adapter             STRING  -- email, sms, voice, etc.
status              STRING DEFAULT 'pending'  -- pending, running, completed, failed
error_message       TEXT
execution_metadata  JSON

started_at          DATETIME
completed_at        DATETIME

-- Relationships
sequence            → sequences
enrollment          → sequence_enrollments
```

**Indexes**:
- `enrollment_id`
- `status`
- `started_at`

### 4. Voice System

#### voice_calls
Voice call records with full details.

```sql
id                          STRING PRIMARY KEY (UUID)
user_id                     INTEGER FK(users.id)
lead_id                     INTEGER FK(leads.id)
sequence_enrollment_id      INTEGER FK(sequence_enrollments.id)

-- Call Details
call_sid                    STRING  -- Legacy carrier identifier
call_control_id             STRING  -- Telnyx call control ID
carrier                     STRING DEFAULT 'telnyx'
from_number                 STRING
to_number                   STRING NOT NULL
direction                   STRING DEFAULT 'outbound'  -- outbound, inbound

-- Status
status                      STRING DEFAULT 'initiated'  -- initiated, ringing, in_progress, completed, failed, no_answer
duration_seconds            INTEGER DEFAULT 0
retry_attempts              INTEGER DEFAULT 0
last_error_code             STRING
last_error_at               DATETIME

-- AI Configuration
ai_voice_id                 STRING  -- ElevenLabs voice ID
ai_instructions             TEXT
conversation_goal           STRING  -- qualify, schedule, follow_up

-- Results
recording_url               STRING
transcript                  TEXT
ai_summary                  JSON
outcome                     STRING  -- scheduled, follow_up, rejected, no_answer, voicemail
interest_level              STRING  -- high, medium, low, none
objections_raised           JSON  -- Array
next_steps                  TEXT

-- Appointment
appointment_scheduled       BOOLEAN DEFAULT false
appointment_datetime        DATETIME
appointment_type            STRING  -- inspection, consultation, estimate

-- Costs
call_cost                   FLOAT DEFAULT 0.0
ai_cost                     FLOAT DEFAULT 0.0
total_cost                  FLOAT DEFAULT 0.0

-- Timestamps
initiated_at                DATETIME
started_at                  DATETIME
ended_at                    DATETIME

-- Real-time Agent Fields
asr_model                   STRING
tts_model                   STRING
llm_model                   STRING
first_audio_latency_ms      INTEGER
p95_latency_ms              INTEGER
transcript_json             JSON  -- Diarized with timings
barge_in_count              INTEGER DEFAULT 0
tool_calls_made             INTEGER DEFAULT 0

-- Enhanced Outcomes
conversation_state          STRING DEFAULT 'greeting'  -- greeting, qualification, offer, etc.
confidence_scores           JSON
silence_periods             JSON

-- Relationships
user                        → users
lead                        → leads
sequence_enrollment         → sequence_enrollments
turns                       → voice_call_turns (CASCADE DELETE)
events                      → voice_call_events (CASCADE DELETE)
```

**Indexes**:
- `user_id`
- `lead_id`
- `call_control_id`
- `status`
- `initiated_at`

#### voice_call_turns
Individual conversation turns in a call.

```sql
id                  BIGINTEGER PRIMARY KEY
call_id             STRING FK(voice_calls.id)
seq                 INTEGER NOT NULL
role                STRING NOT NULL  -- user, agent, tool
text                TEXT
start_ms            INTEGER
end_ms              INTEGER
barge_in            BOOLEAN DEFAULT false
tool_name           STRING
tokens_in           INTEGER
tokens_out          INTEGER
confidence_score    FLOAT
audio_url           STRING

created_at          DATETIME

-- Relationships
call                → voice_calls
```

**Indexes**:
- `call_id`
- `seq`

#### voice_call_events
Events during a voice call.

```sql
id              INTEGER PRIMARY KEY
call_id         STRING FK(voice_calls.id)
event_type      STRING NOT NULL
payload         JSON

created_at      DATETIME

-- Relationships
call            → voice_calls
```

**Common Event Types**:
- `call_initiated`
- `call_ringing`
- `call_answered`
- `call_ended`
- `audio_stream_started`
- `audio_stream_ended`
- `transcription_received`
- `response_generated`

#### voice_bookings
Appointments scheduled from voice calls.

```sql
id                  STRING PRIMARY KEY (UUID)
lead_id             INTEGER FK(leads.id)
call_id             STRING FK(voice_calls.id)

-- Booking Details
window_start        DATETIME NOT NULL
window_end          DATETIME NOT NULL
estimator_id        INTEGER FK(users.id)
location            TEXT
notes               TEXT
booking_type        STRING DEFAULT 'inspection'  -- inspection, consultation, estimate

-- Status
status              STRING DEFAULT 'confirmed'  -- confirmed, rescheduled, cancelled, completed
confirmation_sent   BOOLEAN DEFAULT false
reminder_sent       BOOLEAN DEFAULT false

created_at          DATETIME
updated_at          DATETIME

-- Relationships
lead                → leads
call                → voice_calls
estimator           → users
```

**Indexes**:
- `lead_id`
- `call_id`
- `window_start`
- `status`

#### voice_configurations
Per-user voice agent configuration.

```sql
id                          INTEGER PRIMARY KEY
user_id                     INTEGER FK(users.id)

-- TTS Configuration
default_voice_id            STRING DEFAULT 'default'
tts_vendor                  STRING DEFAULT 'elevenlabs'  -- elevenlabs, cartesia
voice_style                 STRING DEFAULT 'professional'
speaking_rate               FLOAT DEFAULT 1.0
pitch_adjustment            FLOAT DEFAULT 0.0

-- ASR Configuration
asr_vendor                  STRING DEFAULT 'deepgram'  -- deepgram, whisper
asr_language                STRING DEFAULT 'en-US'
enable_punctuation          BOOLEAN DEFAULT true
confidence_threshold        FLOAT DEFAULT 0.7

-- LLM Configuration
llm_vendor                  STRING DEFAULT 'openai'  -- openai, anthropic
llm_model                   STRING DEFAULT 'gpt-4o-mini'
system_prompt_template      TEXT
max_tokens                  INTEGER DEFAULT 150
temperature                 FLOAT DEFAULT 0.7

-- Conversation Settings
max_call_duration_minutes   INTEGER DEFAULT 15
enable_barge_in             BOOLEAN DEFAULT true
silence_timeout_seconds     INTEGER DEFAULT 10

-- Compliance
require_consent             BOOLEAN DEFAULT true
enable_recording            BOOLEAN DEFAULT true
dnc_compliance              BOOLEAN DEFAULT true
jurisdiction                STRING DEFAULT 'US'  -- US, CA, EU

created_at                  DATETIME
updated_at                  DATETIME

-- Relationships
user                        → users (1:1)
```

**Indexes**:
- `user_id` (unique)

#### voice_metrics_daily
Daily aggregated voice metrics per user.

```sql
day                             DATE PRIMARY KEY
user_id                         INTEGER FK(users.id) PRIMARY KEY

-- Call Metrics
calls                           INTEGER DEFAULT 0
connects                        INTEGER DEFAULT 0
avg_duration_s                  INTEGER DEFAULT 0

-- Booking Metrics
bookings                        INTEGER DEFAULT 0
booking_rate                    FLOAT DEFAULT 0.0

-- Performance Metrics
first_minute_latency_ms         INTEGER DEFAULT 0
avg_first_audio_latency_ms      INTEGER DEFAULT 0
p95_latency_ms                  INTEGER DEFAULT 0

-- Quality Metrics
asr_wer                         FLOAT DEFAULT 0.0  -- Word Error Rate
avg_confidence_score            FLOAT DEFAULT 0.0
barge_in_rate                   FLOAT DEFAULT 0.0

-- Outcome Distribution
outcome_scheduled               INTEGER DEFAULT 0
outcome_callback                INTEGER DEFAULT 0
outcome_no_answer               INTEGER DEFAULT 0
outcome_opt_out                 INTEGER DEFAULT 0
outcome_failed                  INTEGER DEFAULT 0

created_at                      DATETIME
updated_at                      DATETIME

-- Relationships
user                            → users
```

**Indexes**:
- `(day, user_id)` (composite primary key)
- `user_id`
- `day`

### 5. Configuration

#### ai_configurations
AI settings per user for all AI features.

```sql
id                              INTEGER PRIMARY KEY
user_id                         INTEGER FK(users.id)

-- Voice Agent Settings
voice_enabled                   BOOLEAN DEFAULT true
voice_id                        STRING DEFAULT 'rachel'
voice_tone                      STRING DEFAULT 'professional'
voice_speed                     FLOAT DEFAULT 1.0
max_call_duration               INTEGER DEFAULT 300  -- seconds
max_objections                  INTEGER DEFAULT 3

-- Email Settings
email_tone                      STRING DEFAULT 'professional'
email_length                    STRING DEFAULT 'medium'
email_personalization           STRING DEFAULT 'high'

-- SMS Settings
sms_tone                        STRING DEFAULT 'friendly'
sms_emoji_enabled               BOOLEAN DEFAULT false

-- Company Voice
company_voice_description       TEXT
key_differentiators             JSON  -- Array
value_propositions              JSON  -- Array
common_objections               JSON  -- Array

-- Custom Prompts
voice_opening_prompt            TEXT
voice_objection_prompts         JSON
voice_closing_prompt            TEXT
email_generation_prompt         TEXT
sms_generation_prompt           TEXT

-- Behavior Settings
ai_creativity                   FLOAT DEFAULT 0.7  -- 0.0-1.0
ai_formality                    FLOAT DEFAULT 0.6  -- 0.0-1.0
urgency_level                   FLOAT DEFAULT 0.5  -- 0.0-1.0

created_at                      DATETIME
updated_at                      DATETIME

-- Relationships
user                            → users (1:1)
```

**Indexes**:
- `user_id` (unique)

### 6. Admin & Billing

#### billing_usage
Tracks all billable usage.

```sql
id              INTEGER PRIMARY KEY
user_id         INTEGER FK(users.id)
day             DATE DEFAULT today
metric          STRING NOT NULL  -- voice_minutes, sms_messages, emails_sent
quantity        FLOAT DEFAULT 0.0
cost_usd        FLOAT DEFAULT 0.0
details         JSON

created_at      DATETIME
updated_at      DATETIME

-- Relationships
user            → users
```

**Indexes**:
- `user_id`
- `day`
- `metric`

**Common Metrics**:
- `voice_minutes`
- `sms_messages`
- `emails_sent`
- `leads_generated`
- `api_calls`

#### audit_logs
Comprehensive audit trail.

```sql
id              INTEGER PRIMARY KEY
user_id         INTEGER FK(users.id)
action          STRING NOT NULL
entity          STRING NOT NULL
entity_id       STRING NOT NULL
details         JSON

created_at      DATETIME

-- Relationships
user            → users
```

**Indexes**:
- `user_id`
- `action`
- `entity`
- `created_at`

**Common Actions**:
- `created`
- `updated`
- `deleted`
- `accessed`
- `exported`

### 7. Contagion System Models

#### properties
Property records for contagion analysis.

```sql
id                      UUID PRIMARY KEY
address                 STRING NOT NULL
street_number           STRING
street_name             STRING
city                    STRING NOT NULL
state                   STRING NOT NULL
zip_code                STRING NOT NULL
subdivision_name        STRING
parcel_id               STRING
latitude                NUMERIC(10,8)
longitude               NUMERIC(11,8)
geom                    GEOGRAPHY(POINT, 4326)  -- PostGIS

-- Property Details
lot_size_sqft           INTEGER
year_built              INTEGER
estimated_value         NUMERIC(12,2)
equity_percent          NUMERIC(5,2)
has_mortgage            BOOLEAN
has_liens               BOOLEAN
recent_refinance        BOOLEAN
recent_heloc            BOOLEAN

-- Roof Details
roof_age_years          INTEGER
roof_material           STRING

-- Owner Details
owner_name              STRING
owner_phone             STRING
owner_email             STRING

-- Lead Management
lead_status             STRING DEFAULT 'new'
appointment_date        DATETIME
last_contacted_at       DATETIME
tags                    JSON
notes                   TEXT

created_at              DATETIME
updated_at              DATETIME

-- Relationships
scores                  → property_scores
social_proof            → social_proof_data (1:1)
reports                 → property_reports
ai_calls                → ai_calls
scheduled_messages      → scheduled_sms
follow_up_tasks         → follow_up_tasks
```

**Indexes**:
- `city, state`
- `zip_code`
- `subdivision_name`
- PostGIS spatial index on `geom`

#### building_permits
Building permit records.

```sql
id                      UUID PRIMARY KEY
address                 STRING NOT NULL
street_number           STRING
street_name             STRING
city                    STRING NOT NULL
state                   STRING NOT NULL
zip_code                STRING NOT NULL
latitude                NUMERIC(10,8)
longitude               NUMERIC(11,8)
geom                    GEOGRAPHY(POINT, 4326)

-- Permit Details
permit_number           STRING UNIQUE
permit_date             DATE NOT NULL
permit_type             STRING
permit_value            NUMERIC(10,2)
contractor_name         STRING
contractor_license      STRING
work_description        TEXT
subdivision_name        STRING
parcel_id               STRING

-- Meta
source_url              STRING
scraped_at              DATETIME
verified                BOOLEAN DEFAULT false

created_at              DATETIME
updated_at              DATETIME
```

**Indexes**:
- `city, state`
- `permit_date`
- `permit_number` (unique)
- PostGIS spatial index

#### contagion_clusters
Identified clusters of roofing activity.

```sql
id                      UUID PRIMARY KEY
city                    STRING NOT NULL
state                   STRING NOT NULL
subdivision_name        STRING
center_latitude         NUMERIC(10,8)
center_longitude        NUMERIC(11,8)
cluster_center          GEOGRAPHY(POINT, 4326)
radius_miles            NUMERIC(5,2) DEFAULT 0.25

-- Cluster Metrics
permit_count            INTEGER DEFAULT 0
avg_permit_value        NUMERIC(10,2)
date_range_start        DATE
date_range_end          DATE
avg_year_built          INTEGER
cluster_score           INTEGER
cluster_status          STRING
properties_in_cluster   INTEGER DEFAULT 0
properties_scored       INTEGER DEFAULT 0
hot_leads_generated     INTEGER DEFAULT 0

metadata                JSONB

created_at              DATETIME
last_scored_at          DATETIME

-- Relationships
scores                  → property_scores
```

**Indexes**:
- `city, state`
- `cluster_score`
- PostGIS spatial index

#### property_scores
Detailed property scoring.

```sql
id                              UUID PRIMARY KEY
property_id                     UUID FK(properties.id) CASCADE
cluster_id                      UUID FK(contagion_clusters.id) SET NULL

-- Contagion Score
contagion_score                 INTEGER DEFAULT 0
permits_within_quarter_mile     INTEGER DEFAULT 0
permits_within_500ft            INTEGER DEFAULT 0
permits_within_100ft            INTEGER DEFAULT 0
same_subdivision_permits        INTEGER DEFAULT 0
nearest_permit_distance_ft      INTEGER
nearest_permit_address          STRING
nearest_permit_date             DATE
neighbor_contractor_names       ARRAY(STRING)

-- Age Match Score
age_match_score                 INTEGER DEFAULT 0
year_built                      INTEGER
roof_age_years                  INTEGER
matches_neighbor_age            BOOLEAN DEFAULT false
age_difference_years            INTEGER
subdivision_avg_age             INTEGER

-- Financial Score
financial_score                 INTEGER DEFAULT 0
home_value                      NUMERIC(10,2)
estimated_equity_percent        NUMERIC(5,2)
estimated_equity_amount         NUMERIC(10,2)
owner_income_estimate           INTEGER
has_mortgage                    BOOLEAN
has_liens                       BOOLEAN
recent_refinance                BOOLEAN
recent_heloc                    BOOLEAN

-- Visual Score
visual_score                    INTEGER DEFAULT 0
has_aerial_analysis             BOOLEAN DEFAULT false
aerial_image_url                STRING
claude_damage_assessment        TEXT
gpt4v_damage_assessment         TEXT
visible_damage_level            STRING
damage_indicators               JSONB
estimated_remaining_life_years  INTEGER

-- Total Score
total_urgency_score             INTEGER
urgency_tier                    STRING  -- HOT, WARM, COLD
confidence_level                STRING
recommended_action              STRING

scored_at                       DATETIME
last_updated_at                 DATETIME
scoring_version                 STRING DEFAULT 'v1.0'
data_sources_used               JSONB

-- Relationships
property                        → properties
cluster                         → contagion_clusters
```

**Indexes**:
- `property_id`
- `total_urgency_score`
- `urgency_tier`

*(Other contagion models documented similarly...)*

## Relationships Summary

### One-to-One (1:1)
- `users` ↔ `voice_configurations`
- `users` ↔ `ai_configurations`
- `properties` ↔ `social_proof_data`

### One-to-Many (1:N)
- `users` → `area_scans`
- `users` → `leads`
- `users` → `sequences`
- `users` → `voice_calls`
- `area_scans` → `leads`
- `leads` → `voice_calls`
- `leads` → `sequence_enrollments`
- `leads` → `lead_activities`
- `sequences` → `sequence_nodes`
- `sequences` → `sequence_enrollments`
- `sequence_enrollments` → `sequence_executions`
- `voice_calls` → `voice_call_turns`
- `voice_calls` → `voice_call_events`
- `properties` → `property_scores`
- `contagion_clusters` → `property_scores`

### Many-to-Many (M:N)
- `leads` ↔ `sequences` (through `sequence_enrollments`)

## Migration Strategy

**Alembic** is used for database migrations.

```bash
# Create migration
cd backend
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

**Migration Files**: `/backend/alembic/versions/`

## Data Integrity

### Foreign Keys
All foreign keys have CASCADE or SET NULL behavior defined:
- DELETE CASCADE: Related records deleted
- SET NULL: Reference set to null

### Constraints
- UNIQUE constraints on identifiers
- NOT NULL on required fields
- CHECK constraints on enums
- DEFAULT values on most fields

### Transactions
All write operations use transactions:
```python
try:
    db.add(record)
    db.commit()
    db.refresh(record)
except Exception as e:
    db.rollback()
    raise
```

## Performance Optimization

### Indexes
Strategic indexes on:
- Foreign keys
- Search fields (city, zip, email)
- Status/state fields
- Timestamp fields for sorting

### Query Optimization
- Use `select_related` / `joinedload` for N+1 prevention
- Select only needed columns
- Paginate large result sets
- Use database-level aggregations

### Caching
- Redis cache for frequently accessed data
- Cache invalidation on updates
- TTL-based expiration

---

**Last Updated**: 2025-10-13  
**Schema Version**: 3.0  
**Next Review**: 2025-11-13





