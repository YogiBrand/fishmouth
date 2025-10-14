"""Application configuration models."""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class FeatureFlags(BaseSettings):
    """Feature toggles allowing mock vs live behaviour."""

    use_mock_imagery: bool = Field(True, description="Serve generated imagery when true")
    use_mock_property_discovery: bool = Field(True)
    use_mock_property_enrichment: bool = Field(True, description="Skip paid enrichment providers")
    use_mock_contact_enrichment: bool = Field(True)
    use_mock_sequence_delivery: bool = Field(True, description="Disable real email/SMS/voice sends")
    enable_voice_agent: bool = Field(True)
    use_inline_scan_runner: bool = Field(True, description="Execute scans inline instead of Celery")
    use_inline_sequence_runner: bool = Field(True, description="Execute sequence processing inline")


class CelerySettings(BaseSettings):
    """Celery / task queue configuration."""

    broker_url: str = Field("redis://localhost:6379/0", env="CELERY_BROKER_URL")
    result_backend: str = Field("redis://localhost:6379/1", env="CELERY_RESULT_BACKEND")
    task_default_queue: str = Field("default")
    worker_concurrency: int = Field(4)
    beat_enabled: bool = Field(True)


class InstrumentationSettings(BaseSettings):
    """Third party observability services."""

    sentry_dsn: Optional[HttpUrl] = Field(default=None, env="SENTRY_DSN")
    sentry_traces_sample_rate: float = Field(0.1, ge=0, le=1)
    sentry_profiles_sample_rate: float = Field(0.0, ge=0, le=1)
    enable_prometheus: bool = Field(True)
    log_level: str = Field("INFO")


class StorageSettings(BaseSettings):
    """File storage configuration."""

    storage_base_url: Optional[str] = None
    storage_root: Path = Path("uploads/aerial")
    s3_bucket: Optional[str] = Field(None, env="S3_BUCKET")
    s3_region: Optional[str] = Field(None, env="S3_REGION")
    s3_access_key_id: Optional[str] = Field(None, env="S3_ACCESS_KEY_ID")
    s3_secret_access_key: Optional[str] = Field(None, env="S3_SECRET_ACCESS_KEY")
    s3_endpoint_url: Optional[str] = Field(None, env="S3_ENDPOINT_URL")


class ProviderSettings(BaseSettings):
    """External provider credentials."""

    mapbox_token: Optional[str] = Field(None, env="MAPBOX_TOKEN")
    google_maps_api_key: Optional[str] = Field(None, env="GOOGLE_MAPS_API_KEY")
    property_enrichment_api_key: Optional[str] = Field(None, env="PROPERTY_ENRICHMENT_API_KEY")
    contact_enrichment_api_key: Optional[str] = Field(None, env="CONTACT_ENRICHMENT_API_KEY")
    sendgrid_api_key: Optional[str] = Field(None, env="SENDGRID_API_KEY")
    postmark_api_token: Optional[str] = Field(None, env="POSTMARK_API_TOKEN")
    telnyx_api_key: Optional[str] = Field(None, env="TELNYX_API_KEY")
    telnyx_messaging_profile_id: Optional[str] = Field(None, env="TELNYX_MESSAGING_PROFILE_ID")
    telnyx_call_control_app_id: Optional[str] = Field(None, env="TELNYX_CALL_CONTROL_APP_ID")
    telnyx_connection_id: Optional[str] = Field(None, env="TELNYX_CONNECTION_ID")
    telnyx_from_number: Optional[str] = Field(None, env="TELNYX_FROM_NUMBER")
    telnyx_webhook_secret: Optional[str] = Field(None, env="TELNYX_WEBHOOK_SECRET")
    telnyx_webhook_public_key: Optional[str] = Field(None, env="TELNYX_WEBHOOK_PUBLIC_KEY")
    vapi_api_key: Optional[str] = Field(None, env="VAPI_API_KEY")
    direct_mail_api_key: Optional[str] = Field(None, env="DIRECT_MAIL_API_KEY")
    direct_mail_api_base: Optional[str] = Field(None, env="DIRECT_MAIL_API_BASE")
    stripe_secret_key: Optional[str] = Field(None, env="STRIPE_SECRET_KEY")
    stripe_price_id: Optional[str] = Field(None, env="STRIPE_PRICE_ID")
    stripe_usage_measurement_method: str = Field("daily", description="daily|hourly usage reporting granularity")
    deepgram_api_key: Optional[str] = Field(None, env="DEEPGRAM_API_KEY")
    elevenlabs_api_key: Optional[str] = Field(None, env="ELEVENLABS_API_KEY")
    openai_api_key: Optional[str] = Field(None, env="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(None, env="ANTHROPIC_API_KEY")


class PipelineResilienceSettings(BaseSettings):
    """Retry, circuit breaker, and rate limiting configuration."""

    imagery_requests_per_minute: int = Field(45, ge=0)
    property_requests_per_minute: int = Field(60, ge=0)
    contact_requests_per_minute: int = Field(60, ge=0)
    provider_failure_threshold: int = Field(4, ge=1)
    provider_recovery_seconds: int = Field(90, ge=1)
    provider_retry_attempts: int = Field(3, ge=1)
    candidate_retry_attempts: int = Field(2, ge=0)
    max_consecutive_candidate_failures: int = Field(5, ge=1)


class Settings(BaseSettings):
    """Primary application settings."""

    environment: str = Field("development")
    base_url: Optional[HttpUrl] = None
    database_url: str = Field("postgresql://fishmouth:fishmouth123@postgres:5432/fishmouth", env="DATABASE_URL")

    # Behaviour toggles
    roof_analysis_mode: str = Field("hybrid", description="live|mock|hybrid")
    property_discovery_limit: int = Field(150)
    scan_batch_size: int = Field(40)
    min_lead_score: float = Field(60.0)
    http_timeout_seconds: int = Field(15)
    pii_hash_salt: str = Field("", description="Optional salt for PII hashing")
    pii_encryption_key: Optional[str] = Field(None, env="PII_ENCRYPTION_KEY", description="Base64 Fernet key for PII encryption")
    frontend_url: Optional[HttpUrl] = Field(None, env="FRONTEND_URL")

    feature_flags: FeatureFlags = FeatureFlags()
    celery: CelerySettings = CelerySettings()
    instrumentation: InstrumentationSettings = InstrumentationSettings()
    storage: StorageSettings = StorageSettings()
    providers: ProviderSettings = ProviderSettings()
    pipeline_resilience: PipelineResilienceSettings = PipelineResilienceSettings()

    allowed_origins: List[str] = Field(default_factory=lambda: ["*"])

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings."""

    return Settings()
