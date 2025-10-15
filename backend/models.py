from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    BigInteger,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import UserDefinedType
from datetime import datetime, date
from database import Base
import enum
import uuid


class Geography(UserDefinedType):
    """Minimal PostGIS geography type for ORM mapping."""

    def __init__(self, geometry_type: str = "POINT", srid: int = 4326) -> None:
        self.geometry_type = geometry_type
        self.srid = srid

    def get_col_spec(self, **kw) -> str:
        return f"GEOGRAPHY({self.geometry_type}, {self.srid})"

    def bind_processor(self, dialect):
        return None

    def result_processor(self, dialect, coltype):
        return None


class LeadPriority(enum.Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"

class LeadStatus(enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL_SENT = "proposal_sent"
    APPOINTMENT_SCHEDULED = "appointment_scheduled"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

class SequenceNodeType(enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    VOICE_CALL = "voice_call"
    WAIT = "wait"
    CONDITION = "condition"
    RESEARCH = "research"
    START = "start"
    END = "end"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    company_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    role = Column(String, default="user")  # user, admin, superadmin
    is_active = Column(Boolean, default=True)
    
    # Enhanced profile fields
    full_name = Column(String, nullable=True)
    business_address = Column(String, nullable=True)
    website = Column(String, nullable=True)
    business_logo_url = Column(String, nullable=True)
    service_area = Column(JSON, nullable=True)  # Array of cities/zip codes
    
    # Subscription and billing
    subscription_tier = Column(String, default="trial")  # trial, professional, enterprise
    subscription_status = Column(String, default="active")
    trial_leads_remaining = Column(Integer, default=25)
    monthly_lead_count = Column(Integer, default=0)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_item_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)

    lead_credits = Column(Integer, default=0)
    gift_credits_awarded = Column(Integer, default=0)
    gift_leads_awarded = Column(Integer, default=0)
    gift_awarded_at = Column(DateTime, nullable=True)
    onboarding_state = Column(JSON, nullable=True, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    scans = relationship("AreaScan", back_populates="user")
    leads = relationship("Lead", back_populates="user")
    sequences = relationship("Sequence", back_populates="user")
    voice_calls = relationship("VoiceCall", back_populates="user")
    voice_config = relationship("VoiceConfiguration", back_populates="user", uselist=False)
    ai_config = relationship("AIConfiguration", back_populates="user", uselist=False)
    scan_jobs = relationship("ScanJob", back_populates="user")

class AreaScan(Base):
    __tablename__ = "area_scans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    area_name = Column(String, nullable=False)  # City, State or Zip Code
    scan_type = Column(String, default="city")  # city, zip_code, custom_area
    status = Column(String, default="pending")  # pending, queued, in_progress, completed, failed
    total_properties = Column(Integer, default=0)
    processed_properties = Column(Integer, default=0)
    qualified_leads = Column(Integer, default=0)
    progress_percentage = Column(Float, default=0.0)
    scan_parameters = Column(JSON, nullable=True)  # radius, filters, etc.
    
    # Results
    results_summary = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="scans")
    leads = relationship("Lead", back_populates="area_scan")


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    area_type = Column(String(40), nullable=False)
    area_payload = Column(JSON, nullable=False)
    provider_policy = Column(JSON, nullable=False)
    filters = Column(JSON, nullable=True)
    enrichment_options = Column(JSON, nullable=True)
    budget_cents = Column(Integer, nullable=False, default=0)
    budget_spent_cents = Column(Integer, nullable=False, default=0)
    status = Column(String(32), nullable=False, default="pending")
    tiles_total = Column(Integer, nullable=False, default=0)
    tiles_processed = Column(Integer, nullable=False, default=0)
    tiles_cached = Column(Integer, nullable=False, default=0)
    leads_generated = Column(Integer, nullable=False, default=0)
    results = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="scan_jobs")

class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        Index("idx_leads_dedupe_key", "dedupe_key", unique=True),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    area_scan_id = Column(Integer, ForeignKey("area_scans.id"), nullable=True)
    
    # Property Information
    address = Column(String, nullable=False)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Roof Analysis
    roof_age_years = Column(Integer, nullable=True)
    roof_condition_score = Column(Float, nullable=True)  # 0-100
    roof_material = Column(String, nullable=True)
    roof_size_sqft = Column(Integer, nullable=True)
    aerial_image_url = Column(String, nullable=True)
    ai_analysis = Column(JSON, nullable=True)  # Detailed AI analysis results
    image_quality_score = Column(Float, nullable=True)
    image_quality_issues = Column(JSON, nullable=True)
    quality_validation_status = Column(String, default="pending")
    analysis_confidence = Column(Float, nullable=True)
    overlay_url = Column(String(500), nullable=True)
    score_version = Column(String(20), nullable=True)
    roof_intelligence = Column(JSON, nullable=True)
    street_view_quality = Column(JSON, nullable=True)

    # Scoring and Classification
    lead_score = Column(Float, nullable=False, default=0.0)  # 0-100
    priority = Column(Enum(LeadPriority), default=LeadPriority.COLD)
    replacement_urgency = Column(String, nullable=True)  # immediate, urgent, plan_ahead, good_condition
    damage_indicators = Column(JSON, nullable=True)  # List of detected issues
    discovery_status = Column(String, nullable=False, default="completed")
    imagery_status = Column(String, nullable=False, default="synthetic")
    property_enrichment_status = Column(String, nullable=False, default="synthetic")
    contact_enrichment_status = Column(String, nullable=False, default="synthetic")

    # Contact Information
    homeowner_name = Column(String, nullable=True)
    homeowner_email = Column(String, nullable=True)
    homeowner_phone = Column(String, nullable=True)
    contact_enriched = Column(Boolean, default=False)
    contact_enrichment_cost = Column(Float, default=0.0)
    voice_opt_out = Column(Boolean, default=False)
    voice_opt_out_reason = Column(String, nullable=True)
    voice_consent_updated_at = Column(DateTime, nullable=True)
    last_voice_contacted = Column(DateTime, nullable=True)
    homeowner_email_hash = Column(String, nullable=True)
    homeowner_phone_hash = Column(String, nullable=True)
    homeowner_email_encrypted = Column(Text, nullable=True)
    homeowner_phone_encrypted = Column(Text, nullable=True)
    dedupe_key = Column(String(64), nullable=True)
    provenance = Column(JSON, nullable=False, default=dict)
    dnc = Column(Boolean, nullable=False, default=False)
    consent_email = Column(Boolean, nullable=False, default=False)
    consent_sms = Column(Boolean, nullable=False, default=False)
    consent_voice = Column(Boolean, nullable=False, default=False)
    
    # Property Data
    property_value = Column(Integer, nullable=True)
    year_built = Column(Integer, nullable=True)
    property_type = Column(String, nullable=True)
    length_of_residence = Column(Integer, nullable=True)
    
    # Lead Management
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    tags = Column(JSON, nullable=True)  # Array of tags
    notes = Column(Text, nullable=True)
    last_contacted = Column(DateTime, nullable=True)
    next_follow_up = Column(DateTime, nullable=True)
    
    # Analytics
    cost_to_generate = Column(Float, default=0.0)
    estimated_value = Column(Float, nullable=True)
    conversion_probability = Column(Float, nullable=True)  # 0-100
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="leads")
    area_scan = relationship("AreaScan", back_populates="leads")
    voice_calls = relationship("VoiceCall", back_populates="lead")
    sequence_enrollments = relationship("SequenceEnrollment", back_populates="lead")
    activities = relationship("LeadActivity", back_populates="lead")

class Sequence(Base):
    __tablename__ = "sequences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_template = Column(Boolean, default=False)
    
    # Sequence Configuration
    flow_data = Column(JSON, nullable=True)  # React Flow nodes and edges
    working_hours_start = Column(String, default="09:00")
    working_hours_end = Column(String, default="17:00")
    working_days = Column(JSON, default=lambda: [1, 2, 3, 4, 5])  # Mon-Fri
    timezone = Column(String, default="America/New_York")
    
    # Performance Metrics
    total_enrolled = Column(Integer, default=0)
    total_completed = Column(Integer, default=0)
    total_converted = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="sequences")
    nodes = relationship("SequenceNode", back_populates="sequence", cascade="all, delete-orphan")
    enrollments = relationship("SequenceEnrollment", back_populates="sequence")
    history_entries = relationship(
        "SequenceHistory",
        back_populates="sequence",
        cascade="all, delete-orphan",
    )

class SequenceNode(Base):
    __tablename__ = "sequence_nodes"

    id = Column(Integer, primary_key=True, index=True)
    sequence_id = Column(Integer, ForeignKey("sequences.id"))
    node_id = Column(String, nullable=False)  # React Flow node ID
    node_type = Column(Enum(SequenceNodeType), nullable=False)
    position_x = Column(Float, default=0)
    position_y = Column(Float, default=0)
    
    # Node Configuration
    config = Column(JSON, nullable=True)  # Node-specific configuration
    ai_instructions = Column(Text, nullable=True)  # Custom AI prompts
    
    # Connections
    next_nodes = Column(JSON, nullable=True)  # Array of next node IDs
    condition_rules = Column(JSON, nullable=True)  # For condition nodes
    
    # Performance
    execution_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sequence = relationship("Sequence", back_populates="nodes")

class SequenceEnrollment(Base):
    __tablename__ = "sequence_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    sequence_id = Column(Integer, ForeignKey("sequences.id"))
    lead_id = Column(Integer, ForeignKey("leads.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Enrollment Status
    status = Column(String, default="active")  # active, paused, completed, failed
    current_node_id = Column(String, nullable=True)
    steps_completed = Column(Integer, default=0)
    next_execution_at = Column(DateTime, nullable=True)
    last_execution_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    conversion_outcome = Column(String, nullable=True)

    # Performance Tracking
    emails_sent = Column(Integer, default=0)
    sms_sent = Column(Integer, default=0)
    calls_made = Column(Integer, default=0)
    emails_opened = Column(Integer, default=0)
    emails_clicked = Column(Integer, default=0)
    converted = Column(Boolean, default=False)
    conversion_date = Column(DateTime, nullable=True)
    
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    sequence = relationship("Sequence", back_populates="enrollments")
    lead = relationship("Lead", back_populates="sequence_enrollments")
    voice_calls = relationship("VoiceCall", back_populates="sequence_enrollment")
    executions = relationship("SequenceExecution", back_populates="enrollment", cascade="all, delete-orphan")
    history = relationship(
        "SequenceHistory",
        back_populates="enrollment",
        cascade="all, delete-orphan",
    )


class SequenceExecution(Base):
    __tablename__ = "sequence_executions"

    id = Column(Integer, primary_key=True, index=True)
    sequence_id = Column(Integer, ForeignKey("sequences.id"), nullable=False)
    enrollment_id = Column(Integer, ForeignKey("sequence_enrollments.id"), nullable=False)
    node_id = Column(String, nullable=False)
    node_type = Column(Enum(SequenceNodeType), nullable=False)
    adapter = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, running, completed, failed
    error_message = Column(Text, nullable=True)
    execution_metadata = Column(JSON, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    sequence = relationship("Sequence")
    enrollment = relationship("SequenceEnrollment", back_populates="executions")


class SequenceHistory(Base):
    __tablename__ = "sequence_history"
    __table_args__ = (
        Index("ix_sequence_history_enrollment", "enrollment_id"),
        Index("ix_sequence_history_sequence", "sequence_id"),
        Index("ix_sequence_history_created_at", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    sequence_id = Column(Integer, ForeignKey("sequences.id", ondelete="CASCADE"), nullable=False)
    enrollment_id = Column(Integer, ForeignKey("sequence_enrollments.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(String, nullable=True)
    step_type = Column(String, nullable=True)
    action = Column(String, nullable=False)
    status = Column(String, nullable=False)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    event_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    occurred_at = Column(DateTime, default=datetime.utcnow)

    sequence = relationship("Sequence", back_populates="history_entries")
    enrollment = relationship("SequenceEnrollment", back_populates="history")

class VoiceCall(Base):
    __tablename__ = "voice_calls"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    lead_id = Column(Integer, ForeignKey("leads.id"))
    sequence_enrollment_id = Column(Integer, ForeignKey("sequence_enrollments.id"), nullable=True)
    
    # Call Details
    call_sid = Column(String, nullable=True)  # External carrier call identifier (legacy)
    call_control_id = Column(String, nullable=True)  # Telnyx call control ID
    carrier = Column(String, default="telnyx")
    from_number = Column(String, nullable=True)
    to_number = Column(String, nullable=False)
    direction = Column(String, default="outbound")  # outbound, inbound
    
    # Call Status
    status = Column(String, default="initiated")  # initiated, ringing, in_progress, completed, failed, no_answer
    duration_seconds = Column(Integer, default=0)
    retry_attempts = Column(Integer, default=0)
    last_error_code = Column(String, nullable=True)
    last_error_at = Column(DateTime, nullable=True)
    
    # AI Configuration
    ai_voice_id = Column(String, nullable=True)  # ElevenLabs voice ID
    ai_instructions = Column(Text, nullable=True)
    conversation_goal = Column(String, nullable=True)  # qualify, schedule, follow_up
    
    # Results
    recording_url = Column(String, nullable=True)
    transcript = Column(Text, nullable=True)
    ai_summary = Column(JSON, nullable=True)
    outcome = Column(String, nullable=True)  # scheduled, follow_up, rejected, no_answer, voicemail
    interest_level = Column(String, nullable=True)  # high, medium, low, none
    objections_raised = Column(JSON, nullable=True)  # Array of objections
    next_steps = Column(Text, nullable=True)
    
    # Appointment Scheduling
    appointment_scheduled = Column(Boolean, default=False)
    appointment_datetime = Column(DateTime, nullable=True)
    appointment_type = Column(String, nullable=True)  # inspection, consultation, estimate
    
    # Costs
    call_cost = Column(Float, default=0.0)
    ai_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    
    initiated_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    
    # Realtime Voice Agent Fields
    asr_model = Column(String, nullable=True)
    tts_model = Column(String, nullable=True)
    llm_model = Column(String, nullable=True)
    first_audio_latency_ms = Column(Integer, nullable=True)
    p95_latency_ms = Column(Integer, nullable=True)
    transcript_json = Column(JSON, nullable=True)  # Diarized with word timings
    barge_in_count = Column(Integer, default=0)
    tool_calls_made = Column(Integer, default=0)
    
    # Enhanced Outcomes
    conversation_state = Column(String, default="greeting")  # greeting, qualification, address_verify, roof_status, offer, appointment, confirm, post_call
    confidence_scores = Column(JSON, nullable=True)  # Array of ASR confidence scores
    silence_periods = Column(JSON, nullable=True)  # Array of silence durations
    
    # Relationships
    user = relationship("User", back_populates="voice_calls")
    lead = relationship("Lead", back_populates="voice_calls")
    turns = relationship("VoiceCallTurn", back_populates="call", cascade="all, delete-orphan")
    sequence_enrollment = relationship("SequenceEnrollment", back_populates="voice_calls")
    events = relationship("VoiceCallEvent", back_populates="call", cascade="all, delete-orphan")

# Enhanced Voice Agent Models
class VoiceCallTurn(Base):
    __tablename__ = "voice_call_turns"
    
    id = Column(BigInteger, primary_key=True, index=True)
    call_id = Column(String, ForeignKey("voice_calls.id"))
    seq = Column(Integer, nullable=False)
    role = Column(String, nullable=False)  # user, agent, tool
    text = Column(Text, nullable=True)
    start_ms = Column(Integer, nullable=True)
    end_ms = Column(Integer, nullable=True)
    barge_in = Column(Boolean, default=False)
    tool_name = Column(String, nullable=True)
    tokens_in = Column(Integer, nullable=True)
    tokens_out = Column(Integer, nullable=True)
    confidence_score = Column(Float, nullable=True)
    audio_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    call = relationship("VoiceCall", back_populates="turns")

class VoiceCallEvent(Base):
    __tablename__ = "voice_call_events"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(String, ForeignKey("voice_calls.id"), nullable=False)
    event_type = Column(String, nullable=False)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    call = relationship("VoiceCall", back_populates="events")

class VoiceBooking(Base):
    __tablename__ = "voice_bookings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lead_id = Column(Integer, ForeignKey("leads.id"))
    call_id = Column(String, ForeignKey("voice_calls.id"))
    
    # Booking Details
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    estimator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    location = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    booking_type = Column(String, default="inspection")  # inspection, consultation, estimate
    
    # Status
    status = Column(String, default="confirmed")  # confirmed, rescheduled, cancelled, completed
    confirmation_sent = Column(Boolean, default=False)
    reminder_sent = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    lead = relationship("Lead")
    call = relationship("VoiceCall")
    estimator = relationship("User")

class VoiceMetricsDaily(Base):
    __tablename__ = "voice_metrics_daily"
    
    day = Column(Date, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    
    # Call Metrics
    calls = Column(Integer, default=0)
    connects = Column(Integer, default=0)  # calls > 30 seconds
    avg_duration_s = Column(Integer, default=0)
    
    # Booking Metrics
    bookings = Column(Integer, default=0)
    booking_rate = Column(Float, default=0.0)
    
    # Performance Metrics
    first_minute_latency_ms = Column(Integer, default=0)
    avg_first_audio_latency_ms = Column(Integer, default=0)
    p95_latency_ms = Column(Integer, default=0)
    
    # Quality Metrics
    asr_wer = Column(Float, default=0.0)  # Word Error Rate
    avg_confidence_score = Column(Float, default=0.0)
    barge_in_rate = Column(Float, default=0.0)
    
    # Outcome Distribution
    outcome_scheduled = Column(Integer, default=0)
    outcome_callback = Column(Integer, default=0)
    outcome_no_answer = Column(Integer, default=0)
    outcome_opt_out = Column(Integer, default=0)
    outcome_failed = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User")

class VoiceConfiguration(Base):
    __tablename__ = "voice_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # TTS Configuration
    default_voice_id = Column(String, default="default")
    tts_vendor = Column(String, default="elevenlabs")  # elevenlabs, cartesia
    voice_style = Column(String, default="professional")  # professional, friendly, urgent
    speaking_rate = Column(Float, default=1.0)
    pitch_adjustment = Column(Float, default=0.0)
    
    # ASR Configuration
    asr_vendor = Column(String, default="deepgram")  # deepgram, whisper
    asr_language = Column(String, default="en-US")
    enable_punctuation = Column(Boolean, default=True)
    confidence_threshold = Column(Float, default=0.7)
    
    # LLM Configuration
    llm_vendor = Column(String, default="openai")  # openai, anthropic
    llm_model = Column(String, default="gpt-4o-mini")
    system_prompt_template = Column(Text, nullable=True)
    max_tokens = Column(Integer, default=150)
    temperature = Column(Float, default=0.7)
    
    # Conversation Settings
    max_call_duration_minutes = Column(Integer, default=15)
    enable_barge_in = Column(Boolean, default=True)
    silence_timeout_seconds = Column(Integer, default=10)
    
    # Compliance Settings
    require_consent = Column(Boolean, default=True)
    enable_recording = Column(Boolean, default=True)
    dnc_compliance = Column(Boolean, default=True)
    jurisdiction = Column(String, default="US")  # US, CA, EU
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="voice_config")


class BillingUsage(Base):
    __tablename__ = "billing_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    day = Column(Date, default=date.today)
    metric = Column(String, nullable=False)  # voice_minutes, sms_messages, emails_sent
    quantity = Column(Float, default=0.0)
    cost_usd = Column(Float, default=0.0)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    entity = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

class LeadActivity(Base):
    __tablename__ = "lead_activities"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Activity Details
    activity_type = Column(String, nullable=False)  # email_sent, sms_sent, call_made, note_added, status_changed
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    activity_metadata = Column(JSON, nullable=True)  # Additional data specific to activity type
    
    # Results
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    lead = relationship("Lead", back_populates="activities")

class AIConfiguration(Base):
    __tablename__ = "ai_configurations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Voice Agent Settings
    voice_enabled = Column(Boolean, default=True)
    voice_id = Column(String, default="rachel")  # ElevenLabs voice ID
    voice_tone = Column(String, default="professional")  # professional, friendly, casual
    voice_speed = Column(Float, default=1.0)  # 0.5 - 2.0
    max_call_duration = Column(Integer, default=300)  # seconds
    max_objections = Column(Integer, default=3)
    
    # Email Settings
    email_tone = Column(String, default="professional")
    email_length = Column(String, default="medium")  # short, medium, long
    email_personalization = Column(String, default="high")  # low, medium, high
    
    # SMS Settings
    sms_tone = Column(String, default="friendly")
    sms_emoji_enabled = Column(Boolean, default=False)
    
    # Company Voice
    company_voice_description = Column(Text, nullable=True)
    key_differentiators = Column(JSON, nullable=True)  # Array of unique selling points
    value_propositions = Column(JSON, nullable=True)  # Array of value props
    common_objections = Column(JSON, nullable=True)  # Array of objection handling
    
    # Custom Prompts
    voice_opening_prompt = Column(Text, nullable=True)
    voice_objection_prompts = Column(JSON, nullable=True)
    voice_closing_prompt = Column(Text, nullable=True)
    email_generation_prompt = Column(Text, nullable=True)
    sms_generation_prompt = Column(Text, nullable=True)
    
    # Behavior Settings
    ai_creativity = Column(Float, default=0.7)  # 0.0 - 1.0
    ai_formality = Column(Float, default=0.6)  # 0.0 - 1.0
    urgency_level = Column(Float, default=0.5)  # 0.0 - 1.0
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="ai_config")


class Property(Base):
    __tablename__ = "properties"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    address = Column(String(255), nullable=False)
    street_number = Column(String(50), nullable=True)
    street_name = Column(String(150), nullable=True)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(2), nullable=False, index=True)
    zip_code = Column(String(10), nullable=False, index=True)
    subdivision_name = Column(String(200), nullable=True)
    parcel_id = Column(String(100), nullable=True)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    geom = Column(Geography("POINT", 4326), nullable=True)
    lot_size_sqft = Column(Integer, nullable=True)
    year_built = Column(Integer, nullable=True)
    estimated_value = Column(Numeric(12, 2), nullable=True)
    equity_percent = Column(Numeric(5, 2), nullable=True)
    has_mortgage = Column(Boolean, default=False)
    has_liens = Column(Boolean, default=False)
    recent_refinance = Column(Boolean, default=False)
    recent_heloc = Column(Boolean, default=False)
    roof_age_years = Column(Integer, nullable=True)
    roof_material = Column(String(100), nullable=True)
    owner_name = Column(String(150), nullable=True)
    owner_phone = Column(String(50), nullable=True)
    owner_email = Column(String(255), nullable=True)
    lead_status = Column(String(50), nullable=False, default="new")
    appointment_date = Column(DateTime, nullable=True)
    last_contacted_at = Column(DateTime, nullable=True)
    tags = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    scores = relationship("PropertyScore", back_populates="property")
    social_proof = relationship("SocialProofData", back_populates="property", uselist=False)
    reports = relationship("PropertyReport", back_populates="property")
    ai_calls = relationship("AICall", back_populates="property")
    scheduled_messages = relationship("ScheduledSMS", back_populates="property")
    follow_up_tasks = relationship("FollowUpTask", back_populates="property")
    mail_jobs = relationship("MailJob", back_populates="property")


class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_name = Column(String(200), nullable=False)
    contact_name = Column(String(150), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    license_number = Column(String(100), nullable=True)
    website = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    address = Column(String(255), nullable=True)
    brand_palette = Column(JSON, nullable=True)
    showcase_url = Column(String(500), nullable=True)
    direct_mail_enabled = Column(Boolean, default=False)
    preferred_mail_templates = Column(JSON, nullable=True)
    marketing_contact_email = Column(String(255), nullable=True)
    marketing_contact_phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reports = relationship("PropertyReport", back_populates="contractor")
    user = relationship("User")
    call_campaigns = relationship("CallCampaign", back_populates="contractor")
    ai_calls = relationship("AICall", back_populates="contractor")
    showcases = relationship("ContractorShowcase", back_populates="contractor")
    mail_campaigns = relationship("MailCampaign", back_populates="contractor")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(64), primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    type = Column(String(100), nullable=False)
    config = Column(JSON, nullable=True)
    content = Column(JSON, nullable=True)
    business_profile = Column(JSON, nullable=True)
    status = Column(String(50), default="draft")
    pdf_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    share_url = Column(String(500), nullable=True)
    share_token = Column(String(128), nullable=True)
    preview_url = Column(String(500), nullable=True)
    render_checksum = Column(String(64), nullable=True)
    render_html_path = Column(String(500), nullable=True)
    rendered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)

    lead = relationship("Lead")
    public_shares = relationship("PublicShare", back_populates="report", cascade="all, delete-orphan")


class EventLog(Base):
    __tablename__ = "events"
    __table_args__ = (
        Index("ix_events_created_at", "created_at"),
        Index("ix_events_type", "type"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(String(100), nullable=False)
    actor = Column(String(255), nullable=True)
    lead_id = Column(String(64), nullable=True)
    report_id = Column(String(64), ForeignKey("reports.id", ondelete="SET NULL"), nullable=True)
    call_id = Column(String(64), nullable=True)
    source_service = Column(String(100), nullable=False)
    payload = Column(JSONB, nullable=False, default=dict)
    request_id = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report")


class PublicShare(Base):
    __tablename__ = "public_shares"
    __table_args__ = (
        Index("ix_public_shares_report", "report_id"),
        Index("ix_public_shares_token", "token", unique=True),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String(64), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(32), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=True)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="public_shares")


class EnrichmentCache(Base):
    __tablename__ = "enrichment_cache"

    cache_key = Column(String(128), primary_key=True)
    cache_type = Column(String(32), nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ETLJob(Base):
    __tablename__ = "etl_jobs"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_type = Column(String(64), nullable=False)
    target = Column(String(255), nullable=True)
    status = Column(String(32), nullable=False, default="pending")
    attempt = Column(Integer, nullable=False, default=1)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    records_processed = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    skip_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    job_metadata = Column(JSON, nullable=True)

    errors = relationship("ETLError", back_populates="job", cascade="all, delete-orphan")


class ETLError(Base):
    __tablename__ = "etl_errors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(PGUUID(as_uuid=True), ForeignKey("etl_jobs.id", ondelete="CASCADE"), nullable=False)
    step = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    retryable = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("ETLJob", back_populates="errors")


class BuildingPermit(Base):
    __tablename__ = "building_permits"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    address = Column(String(255), nullable=False)
    street_number = Column(String(50), nullable=True)
    street_name = Column(String(150), nullable=True)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(2), nullable=False, index=True)
    zip_code = Column(String(10), nullable=False, index=True)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    geom = Column(Geography("POINT", 4326), nullable=True)
    permit_number = Column(String(100), nullable=True, unique=True)
    permit_date = Column(Date, nullable=False, index=True)
    permit_type = Column(String(100), nullable=True)
    permit_value = Column(Numeric(10, 2), nullable=True)
    contractor_name = Column(String(200), nullable=True)
    contractor_license = Column(String(100), nullable=True)
    work_description = Column(Text, nullable=True)
    subdivision_name = Column(String(200), nullable=True)
    parcel_id = Column(String(100), nullable=True)
    source_url = Column(String(500), nullable=True)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ContagionCluster(Base):
    __tablename__ = "contagion_clusters"
    __table_args__ = (
        Index("idx_cluster_location", "city", "state"),
        Index("idx_cluster_score", "cluster_score"),
    )

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    city = Column(String(100), nullable=False)
    state = Column(String(2), nullable=False)
    subdivision_name = Column(String(200), nullable=True)
    center_latitude = Column(Numeric(10, 8), nullable=True)
    center_longitude = Column(Numeric(11, 8), nullable=True)
    cluster_center = Column(Geography("POINT", 4326), nullable=True)
    radius_miles = Column(Numeric(5, 2), default=0.25)
    permit_count = Column(Integer, default=0)
    avg_permit_value = Column(Numeric(10, 2), nullable=True)
    date_range_start = Column(Date, nullable=True)
    date_range_end = Column(Date, nullable=True)
    avg_year_built = Column(Integer, nullable=True)
    cluster_score = Column(Integer, nullable=True)
    cluster_status = Column(String(50), nullable=True)
    properties_in_cluster = Column(Integer, default=0)
    properties_scored = Column(Integer, default=0)
    hot_leads_generated = Column(Integer, default=0)
    extra_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_scored_at = Column(DateTime, nullable=True)

    scores = relationship("PropertyScore", back_populates="cluster")


class PropertyScore(Base):
    __tablename__ = "property_scores"
    __table_args__ = (
        Index("idx_property_score", "property_id"),
        Index("idx_urgency_score", "total_urgency_score"),
        Index("idx_urgency_tier", "urgency_tier"),
    )

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False,
    )
    cluster_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("contagion_clusters.id", ondelete="SET NULL"),
        nullable=True,
    )

    contagion_score = Column(Integer, default=0)
    permits_within_quarter_mile = Column(Integer, default=0)
    permits_within_500ft = Column(Integer, default=0)
    permits_within_100ft = Column(Integer, default=0)
    same_subdivision_permits = Column(Integer, default=0)
    nearest_permit_distance_ft = Column(Integer, nullable=True)
    nearest_permit_address = Column(String(255), nullable=True)
    nearest_permit_date = Column(Date, nullable=True)
    neighbor_contractor_names = Column(ARRAY(String), nullable=True)

    age_match_score = Column(Integer, default=0)
    year_built = Column(Integer, nullable=True)
    roof_age_years = Column(Integer, nullable=True)
    matches_neighbor_age = Column(Boolean, default=False)
    age_difference_years = Column(Integer, nullable=True)
    subdivision_avg_age = Column(Integer, nullable=True)

    financial_score = Column(Integer, default=0)
    home_value = Column(Numeric(10, 2), nullable=True)
    estimated_equity_percent = Column(Numeric(5, 2), nullable=True)
    estimated_equity_amount = Column(Numeric(10, 2), nullable=True)
    owner_income_estimate = Column(Integer, nullable=True)
    has_mortgage = Column(Boolean, default=False)
    has_liens = Column(Boolean, default=False)
    recent_refinance = Column(Boolean, default=False)
    recent_heloc = Column(Boolean, default=False)

    visual_score = Column(Integer, default=0)
    has_aerial_analysis = Column(Boolean, default=False)
    aerial_image_url = Column(String(500), nullable=True)
    claude_damage_assessment = Column(Text, nullable=True)
    gpt4v_damage_assessment = Column(Text, nullable=True)
    visible_damage_level = Column(String(50), nullable=True)
    damage_indicators = Column(JSONB, nullable=True)
    estimated_remaining_life_years = Column(Integer, nullable=True)
    image_quality = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    overlays_url = Column(String(500), nullable=True)

    total_urgency_score = Column(Integer, nullable=True)
    urgency_tier = Column(String(20), nullable=True)
    confidence_level = Column(String(20), nullable=True)
    recommended_action = Column(String(100), nullable=True)

    scored_at = Column(DateTime, default=datetime.utcnow)
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    scoring_version = Column(String(20), default="v1.0")
    data_sources_used = Column(JSONB, nullable=True)

    property = relationship("Property", back_populates="scores")
    cluster = relationship("ContagionCluster", back_populates="scores")


class SocialProofData(Base):
    __tablename__ = "social_proof_data"
    __table_args__ = (Index("idx_social_proof_property", "property_id"),)

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False,
    )
    neighbor_addresses = Column(ARRAY(String), nullable=True)
    neighbor_replacement_dates = Column(ARRAY(Date), nullable=True)
    neighbor_contractor_names = Column(ARRAY(String), nullable=True)
    neighbor_permit_values = Column(ARRAY(Numeric(10, 2)), nullable=True)
    hoa_name = Column(String(200), nullable=True)
    nextdoor_activity_level = Column(String(50), nullable=True)
    facebook_group_mentions = Column(Integer, default=0)
    community_reputation_score = Column(Integer, nullable=True)
    testimonials_nearby = Column(JSONB, nullable=True)
    before_after_photos = Column(JSONB, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="social_proof")


class PropertyReport(Base):
    __tablename__ = "property_reports"
    __table_args__ = (
        Index("idx_report_property", "property_id"),
        Index("idx_report_contractor", "contractor_id"),
        Index("idx_report_generated", "generated_at"),
    )

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False,
    )
    contractor_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("contractors.id", ondelete="CASCADE"),
        nullable=False,
    )
    report_type = Column(String(50), nullable=True)
    report_title = Column(String(255), nullable=True)
    pdf_url = Column(String(500), nullable=True)
    pdf_file_size_kb = Column(Integer, nullable=True)
    page_count = Column(Integer, nullable=True)

    executive_summary = Column(Text, nullable=True)
    damage_findings = Column(JSONB, nullable=True)
    recommendations = Column(JSONB, nullable=True)
    cost_estimates = Column(JSONB, nullable=True)
    urgency_level = Column(String(50), nullable=True)

    aerial_images = Column(JSONB, nullable=True)
    damage_overlay_images = Column(JSONB, nullable=True)
    street_view_comparison = Column(JSONB, nullable=True)
    neighbor_examples = Column(JSONB, nullable=True)

    contractor_logo_url = Column(String(500), nullable=True)
    contractor_branding = Column(JSONB, nullable=True)
    custom_message = Column(Text, nullable=True)

    sent_to_homeowner = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    downloaded_at = Column(DateTime, nullable=True)
    homeowner_response = Column(String(100), nullable=True)

    generated_at = Column(DateTime, default=datetime.utcnow)
    generation_time_seconds = Column(Numeric(5, 2), nullable=True)
    ai_model_used = Column(String(100), nullable=True)

    view_count = Column(Integer, default=0)
    report_payload = Column(JSONB, nullable=True)

    property = relationship("Property", back_populates="reports")
    contractor = relationship("Contractor", back_populates="reports")


class CallCampaign(Base):
    __tablename__ = "call_campaigns"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    contractor_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("contractors.id", ondelete="CASCADE"),
        nullable=False,
    )
    lead_count = Column(Integer, default=0)
    extra_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contractor = relationship("Contractor", back_populates="call_campaigns")
    calls = relationship("AICall", back_populates="campaign")


class AICall(Base):
    __tablename__ = "ai_calls"
    __table_args__ = (
        Index("idx_ai_calls_lead", "lead_id"),
        Index("idx_ai_calls_contractor", "contractor_id"),
    )

    id = Column(String, primary_key=True)
    lead_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False,
    )
    contractor_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("contractors.id", ondelete="CASCADE"),
        nullable=False,
    )
    campaign_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("call_campaigns.id", ondelete="SET NULL"),
        nullable=True,
    )
    phone_number = Column(String(50), nullable=False)
    status = Column(String(50), default="initiated")
    duration_seconds = Column(Integer, default=0)
    appointment_booked = Column(Boolean, default=False)
    outcome = Column(String(50), nullable=True)
    extra_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    answered_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    telnyx_call_id = Column(String(100), nullable=True)
    vapi_session_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    property = relationship("Property", back_populates="ai_calls")
    contractor = relationship("Contractor", back_populates="ai_calls")
    campaign = relationship("CallCampaign", back_populates="calls")


class ScheduledSMS(Base):
    __tablename__ = "scheduled_sms"
    __table_args__ = (Index("idx_scheduled_sms_lead", "lead_id"),)

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False,
    )
    message = Column(Text, nullable=False)
    send_at = Column(DateTime, nullable=False)
    provider = Column(String(50), default="telnyx")
    delivery_status = Column(String(50), default="queued")
    telnyx_message_id = Column(String(100), nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="scheduled_messages")


class FollowUpTask(Base):
    __tablename__ = "follow_up_tasks"
    __table_args__ = (Index("idx_follow_up_tasks_lead", "lead_id"),)

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False,
    )
    task_type = Column(String(50), nullable=False)
    scheduled_for = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    extra_data = Column(JSONB, nullable=True)

    property = relationship("Property", back_populates="follow_up_tasks")


class ContractorShowcase(Base):
    __tablename__ = "contractor_showcases"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contractor_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("contractors.id", ondelete="CASCADE"),
        nullable=False,
    )
    slug = Column(String(64), unique=True, nullable=False)
    share_url = Column(String(500), nullable=False)
    theme = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_generated_at = Column(DateTime, nullable=True)

    contractor = relationship("Contractor", back_populates="showcases")


class MailCampaign(Base):
    __tablename__ = "mail_campaigns"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contractor_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("contractors.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(200), nullable=False)
    template_key = Column(String(100), nullable=False)
    status = Column(String(50), default="draft")  # draft, scheduled, sent
    settings = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_for = Column(DateTime, nullable=True)

    contractor = relationship("Contractor", back_populates="mail_campaigns")
    jobs = relationship("MailJob", back_populates="campaign")


class MailJob(Base):
    __tablename__ = "mail_jobs"
    __table_args__ = (
        Index("idx_mail_jobs_campaign", "campaign_id"),
        Index("idx_mail_jobs_lead", "property_id"),
    )

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("mail_campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    property_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False,
    )
    recipient_name = Column(String(150), nullable=True)
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(2), nullable=False)
    postal_code = Column(String(10), nullable=False)
    status = Column(String(50), default="queued")  # queued, submitted, in_production, delivered, failed
    provider_job_id = Column(String(100), nullable=True)
    cost_usd = Column(Numeric(6, 2), nullable=True)
    scheduled_for = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    extra_data = Column(JSONB, nullable=True)

    campaign = relationship("MailCampaign", back_populates="jobs")
    property = relationship("Property", back_populates="mail_jobs")


class OutboxMessage(Base):
    __tablename__ = "outbox_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    channel = Column(String(16), nullable=False)
    to_address = Column(String(512), nullable=False)
    subject = Column(String(512), nullable=True)
    body_html = Column(Text, nullable=True)
    body_text = Column(Text, nullable=True)
    payload = Column(JSONB, nullable=False, default=dict)
    status = Column(String(32), nullable=False, default="queued")
    provider = Column(String(64), nullable=True)
    provider_message_id = Column(String(128), nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    queued_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)

    events = relationship("MessageEvent", back_populates="message", cascade="all, delete-orphan")


class MessageEvent(Base):
    __tablename__ = "message_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String(36), ForeignKey("outbox_messages.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(32), nullable=False)
    meta = Column(JSONB, nullable=False, default=dict)
    occurred_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    message = relationship("OutboxMessage", back_populates="events")


class ContractorProspect(Base):
    __tablename__ = "contractor_prospects"
    __table_args__ = (
        Index("ix_contractor_prospects_status", "status"),
        Index("ix_contractor_prospects_city_state", "city", "state"),
        Index("ix_contractor_prospects_score", "score"),
        Index("ux_contractor_identity_hash", "identity_hash", unique=True),
    )

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(200), nullable=False)
    contact_name = Column(String(150), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(255), nullable=True)
    address = Column(String(255), nullable=True)
    city = Column(String(120), nullable=True)
    state = Column(String(40), nullable=True)
    postal_code = Column(String(20), nullable=True)
    source = Column(String(120), nullable=False)
    identity_hash = Column(String(120), nullable=False)
    score = Column(Float, nullable=True)
    tags = Column(JSONB, nullable=False, default=dict)
    enriched = Column(JSONB, nullable=False, default=dict)
    status = Column(String(32), nullable=False, default="new")
    sequence_stage = Column(Integer, nullable=False, default=0)
    first_seen = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_seen = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_contacted_at = Column(DateTime, nullable=True)
    next_contact_at = Column(DateTime, nullable=True)
    reply_status = Column(String(32), nullable=True)
    last_reply_at = Column(DateTime, nullable=True)
    extra_metadata = Column(JSONB, nullable=False, default=dict)

    events = relationship(
        "ContractorProspectEvent",
        back_populates="prospect",
        cascade="all, delete-orphan",
    )


class ContractorProspectEvent(Base):
    __tablename__ = "contractor_prospect_events"
    __table_args__ = (
        Index("ix_contractor_prospect_events_prospect", "prospect_id"),
        Index("ix_contractor_prospect_events_type", "type"),
    )

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prospect_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("contractor_prospects.id", ondelete="CASCADE"),
        nullable=False,
    )
    type = Column(String(64), nullable=False)
    payload = Column(JSONB, nullable=False, default=dict)
    occurred_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    prospect = relationship("ContractorProspect", back_populates="events")


class Template(Base):
    __tablename__ = "templates"
    __table_args__ = (
        CheckConstraint("scope IN ('report','email','sms')", name="templates_scope_check"),
    )

    id = Column(String(128), primary_key=True)
    scope = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    is_system = Column(Boolean, nullable=False, default=False)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
