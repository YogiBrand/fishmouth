"""Database connection and lightweight schema guards."""

from __future__ import annotations

import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fishmouth.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def _ensure_schema() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    # -------------------- Users --------------------
    if "users" in tables:
        existing_users = {column["name"] for column in inspector.get_columns("users")}
        user_columns = {
            "stripe_customer_id": "ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR",
            "stripe_subscription_item_id": "ALTER TABLE users ADD COLUMN stripe_subscription_item_id VARCHAR",
            "stripe_subscription_id": "ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR",
            "lead_credits": "ALTER TABLE users ADD COLUMN lead_credits INTEGER NOT NULL DEFAULT 0",
            "gift_credits_awarded": "ALTER TABLE users ADD COLUMN gift_credits_awarded INTEGER NOT NULL DEFAULT 0",
            "gift_leads_awarded": "ALTER TABLE users ADD COLUMN gift_leads_awarded INTEGER NOT NULL DEFAULT 0",
            "gift_awarded_at": "ALTER TABLE users ADD COLUMN gift_awarded_at DATETIME",
            "onboarding_state": (
                "ALTER TABLE users ADD COLUMN onboarding_state JSONB NOT NULL DEFAULT '{}'::jsonb"
                if engine.dialect.name != "sqlite"
                else "ALTER TABLE users ADD COLUMN onboarding_state JSON NOT NULL DEFAULT '{}'"
            ),
            "wallet_balance_cents": "ALTER TABLE users ADD COLUMN wallet_balance_cents INTEGER NOT NULL DEFAULT 0",
        }
        with engine.begin() as connection:
            for column_name, ddl in user_columns.items():
                if column_name not in existing_users:
                    connection.execute(text(ddl))

    # -------------------- Leads --------------------
    if "leads" in tables:
        existing_leads = {column["name"] for column in inspector.get_columns("leads")}
        provenance_ddl = "ALTER TABLE leads ADD COLUMN provenance JSON DEFAULT '{}'"
        if engine.dialect.name == "postgresql":
            provenance_ddl = "ALTER TABLE leads ADD COLUMN provenance JSONB NOT NULL DEFAULT '{}'::jsonb"

        lead_columns = {
            "discovery_status": "ALTER TABLE leads ADD COLUMN discovery_status VARCHAR NOT NULL DEFAULT 'completed'",
            "imagery_status": "ALTER TABLE leads ADD COLUMN imagery_status VARCHAR NOT NULL DEFAULT 'synthetic'",
            "property_enrichment_status": "ALTER TABLE leads ADD COLUMN property_enrichment_status VARCHAR NOT NULL DEFAULT 'synthetic'",
            "contact_enrichment_status": "ALTER TABLE leads ADD COLUMN contact_enrichment_status VARCHAR NOT NULL DEFAULT 'synthetic'",
            "image_quality_score": "ALTER TABLE leads ADD COLUMN image_quality_score FLOAT",
            "image_quality_issues": "ALTER TABLE leads ADD COLUMN image_quality_issues "
            + ("JSONB" if engine.dialect.name == "postgresql" else "JSON"),
            "quality_validation_status": "ALTER TABLE leads ADD COLUMN quality_validation_status VARCHAR DEFAULT 'pending'",
            "voice_opt_out": "ALTER TABLE leads ADD COLUMN voice_opt_out BOOLEAN NOT NULL DEFAULT 0",
            "voice_opt_out_reason": "ALTER TABLE leads ADD COLUMN voice_opt_out_reason VARCHAR",
            "voice_consent_updated_at": "ALTER TABLE leads ADD COLUMN voice_consent_updated_at DATETIME",
            "last_voice_contacted": "ALTER TABLE leads ADD COLUMN last_voice_contacted DATETIME",
            "homeowner_email_hash": "ALTER TABLE leads ADD COLUMN homeowner_email_hash VARCHAR",
            "homeowner_phone_hash": "ALTER TABLE leads ADD COLUMN homeowner_phone_hash VARCHAR",
            "homeowner_email_encrypted": "ALTER TABLE leads ADD COLUMN homeowner_email_encrypted TEXT",
            "homeowner_phone_encrypted": "ALTER TABLE leads ADD COLUMN homeowner_phone_encrypted TEXT",
            "dedupe_key": "ALTER TABLE leads ADD COLUMN dedupe_key VARCHAR(64)",
            "provenance": provenance_ddl,
            "dnc": "ALTER TABLE leads ADD COLUMN dnc BOOLEAN NOT NULL DEFAULT 0",
            "consent_email": "ALTER TABLE leads ADD COLUMN consent_email BOOLEAN NOT NULL DEFAULT 0",
            "consent_sms": "ALTER TABLE leads ADD COLUMN consent_sms BOOLEAN NOT NULL DEFAULT 0",
            "consent_voice": "ALTER TABLE leads ADD COLUMN consent_voice BOOLEAN NOT NULL DEFAULT 0",
            "analysis_confidence": "ALTER TABLE leads ADD COLUMN analysis_confidence FLOAT",
            "overlay_url": "ALTER TABLE leads ADD COLUMN overlay_url VARCHAR(500)",
            "score_version": "ALTER TABLE leads ADD COLUMN score_version VARCHAR(20)",
            "roof_intelligence": "ALTER TABLE leads ADD COLUMN roof_intelligence "
            + ("JSONB" if engine.dialect.name == "postgresql" else "JSON"),
            "street_view_quality": "ALTER TABLE leads ADD COLUMN street_view_quality "
            + ("JSONB" if engine.dialect.name == "postgresql" else "JSON"),
        }
        with engine.begin() as connection:
            for column_name, ddl in lead_columns.items():
                if column_name not in existing_leads:
                    connection.execute(text(ddl))

        with engine.begin() as connection:
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS leads_dedupe_key_idx ON leads (dedupe_key)"))

    # -------------------- Property Scores optional columns --------------------
    if "property_scores" in tables:
        existing_scores = {column["name"] for column in inspector.get_columns("property_scores")}
        score_columns = {
            "image_quality": "ALTER TABLE property_scores ADD COLUMN image_quality FLOAT",
            "confidence": "ALTER TABLE property_scores ADD COLUMN confidence FLOAT",
            "overlays_url": "ALTER TABLE property_scores ADD COLUMN overlays_url VARCHAR(500)",
        }
        with engine.begin() as connection:
            for column_name, ddl in score_columns.items():
                if column_name not in existing_scores:
                    connection.execute(text(ddl))

    # -------------------- Voice Calls --------------------
    if "voice_calls" in tables:
        existing_voice = {column["name"] for column in inspector.get_columns("voice_calls")}
        voice_columns = {
            "call_control_id": "ALTER TABLE voice_calls ADD COLUMN call_control_id VARCHAR",
            "carrier": "ALTER TABLE voice_calls ADD COLUMN carrier VARCHAR DEFAULT 'telnyx'",
            "retry_attempts": "ALTER TABLE voice_calls ADD COLUMN retry_attempts INTEGER DEFAULT 0",
            "last_error_code": "ALTER TABLE voice_calls ADD COLUMN last_error_code VARCHAR",
            "last_error_at": "ALTER TABLE voice_calls ADD COLUMN last_error_at DATETIME",
        }
        with engine.begin() as connection:
            for column_name, ddl in voice_columns.items():
                if column_name not in existing_voice:
                    connection.execute(text(ddl))

    # -------------------- Voice Call Events table --------------------
    if "voice_call_events" not in tables:
        # Basic schema compatible with SQLite & Postgres
        create_table_sql = (
            "CREATE TABLE voice_call_events "
            "(id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "call_id VARCHAR NOT NULL, "
            "event_type VARCHAR NOT NULL, "
            "payload JSON, "
            "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY(call_id) REFERENCES voice_calls(id))"
        )
        # SQLite uses AUTOINCREMENT; Postgres uses SERIAL - adjust dynamically
        if engine.dialect.name != "sqlite":
            create_table_sql = (
                "CREATE TABLE voice_call_events (id SERIAL PRIMARY KEY, call_id VARCHAR NOT NULL, "
                "event_type VARCHAR NOT NULL, payload JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                "FOREIGN KEY(call_id) REFERENCES voice_calls(id))"
            )
        with engine.begin() as connection:
            connection.execute(text(create_table_sql))

    # -------------------- Reports optional columns --------------------
    if "reports" in tables:
        existing_reports = {column["name"] for column in inspector.get_columns("reports")}
        with engine.begin() as connection:
            if "render_checksum" not in existing_reports:
                connection.execute(text("ALTER TABLE reports ADD COLUMN render_checksum VARCHAR(64)"))
            if "render_html_path" not in existing_reports:
                connection.execute(text("ALTER TABLE reports ADD COLUMN render_html_path VARCHAR(500)"))
            if "preview_url" not in existing_reports:
                connection.execute(text("ALTER TABLE reports ADD COLUMN preview_url VARCHAR(500)"))
            if "rendered_at" not in existing_reports:
                rendered_type = "TIMESTAMP" if engine.dialect.name != "sqlite" else "DATETIME"
                connection.execute(text(f"ALTER TABLE reports ADD COLUMN rendered_at {rendered_type}"))

    # -------------------- Events table --------------------
    if "events" not in tables:
        if engine.dialect.name == "sqlite":
            create_events_sql = (
                "CREATE TABLE events ("
                "id VARCHAR(36) PRIMARY KEY, "
                "type VARCHAR(100) NOT NULL, "
                "actor VARCHAR(255), "
                "lead_id INTEGER, "
                "report_id VARCHAR(64), "
                "call_id VARCHAR(64), "
                "source_service VARCHAR(100) NOT NULL, "
                "payload JSON NOT NULL DEFAULT '{}', "
                "request_id VARCHAR(128), "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
            )
            with engine.begin() as connection:
                connection.execute(text(create_events_sql))
                connection.execute(text("CREATE INDEX IF NOT EXISTS ix_events_created_at ON events (created_at)"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS ix_events_type ON events (type)"))
        else:
            with engine.begin() as connection:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
                connection.execute(
                    text(
                        "CREATE TABLE events ("
                        "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                        "type TEXT NOT NULL, "
                        "actor TEXT, "
                        "lead_id INTEGER, "
                        "report_id VARCHAR(64), "
                        "call_id UUID, "
                        "source_service TEXT NOT NULL, "
                        "payload JSONB NOT NULL DEFAULT '{}'::jsonb, "
                        "request_id TEXT, "
                        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
                    )
                )
                connection.execute(text("CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at)"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS idx_events_type ON events (type)"))

    # -------------------- Public Shares table --------------------
    if "public_shares" not in tables:
        if engine.dialect.name == "sqlite":
            create_public_shares_sql = (
                "CREATE TABLE public_shares ("
                "id VARCHAR(36) PRIMARY KEY, "
                "report_id VARCHAR(64) NOT NULL, "
                "token VARCHAR(32) NOT NULL UNIQUE, "
                "expires_at DATETIME, "
                "revoked BOOLEAN NOT NULL DEFAULT 0, "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
                "FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE)"
            )
            with engine.begin() as connection:
                connection.execute(text(create_public_shares_sql))
                connection.execute(text("CREATE INDEX IF NOT EXISTS ix_public_shares_report ON public_shares (report_id)"))
                connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_public_shares_token ON public_shares (token)"))
        else:
            with engine.begin() as connection:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
                connection.execute(
                    text(
                        "CREATE TABLE public_shares ("
                        "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                        "report_id VARCHAR(64) NOT NULL REFERENCES reports(id) ON DELETE CASCADE, "
                        "token CHAR(32) NOT NULL UNIQUE, "
                        "expires_at TIMESTAMPTZ, "
                        "revoked BOOLEAN NOT NULL DEFAULT FALSE, "
                        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
                    )
                )
                connection.execute(text("CREATE INDEX IF NOT EXISTS idx_public_shares_report_id ON public_shares (report_id)"))
                connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_public_shares_token ON public_shares (token)"))

    # -------------------- Scan Jobs table --------------------
    if "scan_jobs" not in tables:
        if engine.dialect.name == "postgresql":
            scan_jobs_sql = (
                "CREATE TABLE scan_jobs ("
                "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                "user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, "
                "area_type VARCHAR(40) NOT NULL, "
                "area_payload JSONB NOT NULL, "
                "provider_policy JSONB NOT NULL, "
                "filters JSONB, "
                "enrichment_options JSONB, "
                "budget_cents INTEGER NOT NULL DEFAULT 0, "
                "budget_spent_cents INTEGER NOT NULL DEFAULT 0, "
                "status VARCHAR(32) NOT NULL DEFAULT 'pending', "
                "tiles_total INTEGER NOT NULL DEFAULT 0, "
                "tiles_processed INTEGER NOT NULL DEFAULT 0, "
                "tiles_cached INTEGER NOT NULL DEFAULT 0, "
                "leads_generated INTEGER NOT NULL DEFAULT 0, "
                "results JSONB, "
                "error_message TEXT, "
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                "started_at TIMESTAMP, "
                "finished_at TIMESTAMP"
                ")"
            )
        else:
            scan_jobs_sql = (
                "CREATE TABLE scan_jobs ("
                "id TEXT PRIMARY KEY, "
                "user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, "
                "area_type VARCHAR(40) NOT NULL, "
                "area_payload JSON NOT NULL, "
                "provider_policy JSON NOT NULL, "
                "filters JSON, "
                "enrichment_options JSON, "
                "budget_cents INTEGER NOT NULL DEFAULT 0, "
                "budget_spent_cents INTEGER NOT NULL DEFAULT 0, "
                "status VARCHAR(32) NOT NULL DEFAULT 'pending', "
                "tiles_total INTEGER NOT NULL DEFAULT 0, "
                "tiles_processed INTEGER NOT NULL DEFAULT 0, "
                "tiles_cached INTEGER NOT NULL DEFAULT 0, "
                "leads_generated INTEGER NOT NULL DEFAULT 0, "
                "results JSON, "
                "error_message TEXT, "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
                "started_at DATETIME, "
                "finished_at DATETIME"
                ")"
            )
        with engine.begin() as connection:
            connection.execute(text(scan_jobs_sql))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_scan_jobs_user ON scan_jobs (user_id)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_scan_jobs_status ON scan_jobs (status)"))

    # -------------------- ETL jobs table --------------------
    if "etl_jobs" not in tables:
        if engine.dialect.name == "postgresql":
            job_table_sql = (
                "CREATE TABLE etl_jobs ("
                "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                "job_type VARCHAR(64) NOT NULL, "
                "target VARCHAR(255), "
                "status VARCHAR(32) NOT NULL DEFAULT 'pending', "
                "attempt INTEGER NOT NULL DEFAULT 1, "
                "started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                "finished_at TIMESTAMP, "
                "records_processed INTEGER DEFAULT 0, "
                "success_count INTEGER DEFAULT 0, "
                "skip_count INTEGER DEFAULT 0, "
                "error_count INTEGER DEFAULT 0, "
                "job_metadata JSONB"
                ")"
            )
        else:
            job_table_sql = (
                "CREATE TABLE etl_jobs ("
                "id VARCHAR(36) PRIMARY KEY, "
                "job_type VARCHAR(64) NOT NULL, "
                "target VARCHAR(255), "
                "status VARCHAR(32) NOT NULL DEFAULT 'pending', "
                "attempt INTEGER NOT NULL DEFAULT 1, "
                "started_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
                "finished_at DATETIME, "
                "records_processed INTEGER DEFAULT 0, "
                "success_count INTEGER DEFAULT 0, "
                "skip_count INTEGER DEFAULT 0, "
                "error_count INTEGER DEFAULT 0, "
                "job_metadata JSON"
                ")"
            )
        with engine.begin() as connection:
            connection.execute(text(job_table_sql))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_etl_jobs_type ON etl_jobs (job_type)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_etl_jobs_status ON etl_jobs (status)"))

    # -------------------- ETL errors table --------------------
    if "etl_errors" not in tables:
        if engine.dialect.name == "postgresql":
            error_table_sql = (
                "CREATE TABLE etl_errors ("
                "id SERIAL PRIMARY KEY, "
                "job_id UUID NOT NULL REFERENCES etl_jobs(id) ON DELETE CASCADE, "
                "step VARCHAR(100) NOT NULL, "
                "message TEXT NOT NULL, "
                "retryable BOOLEAN NOT NULL DEFAULT TRUE, "
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        else:
            error_table_sql = (
                "CREATE TABLE etl_errors ("
                "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                "job_id VARCHAR(36) NOT NULL, "
                "step VARCHAR(100) NOT NULL, "
                "message TEXT NOT NULL, "
                "retryable BOOLEAN NOT NULL DEFAULT 1, "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
                "FOREIGN KEY(job_id) REFERENCES etl_jobs(id) ON DELETE CASCADE"
                ")"
            )
        with engine.begin() as connection:
            connection.execute(text(error_table_sql))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_etl_errors_job ON etl_errors (job_id)"))

    # -------------------- Enrichment cache table --------------------
    if "enrichment_cache" not in tables:
        if engine.dialect.name == "postgresql":
            cache_table_sql = (
                "CREATE TABLE enrichment_cache ("
                "cache_key VARCHAR(128) PRIMARY KEY, "
                "cache_type VARCHAR(32) NOT NULL, "
                "payload JSONB NOT NULL, "
                "expires_at TIMESTAMP NOT NULL, "
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        else:
            cache_table_sql = (
                "CREATE TABLE enrichment_cache ("
                "cache_key VARCHAR(128) PRIMARY KEY, "
                "cache_type VARCHAR(32) NOT NULL, "
                "payload JSON NOT NULL, "
                "expires_at DATETIME NOT NULL, "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
                "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        with engine.begin() as connection:
            connection.execute(text(cache_table_sql))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_enrichment_cache_type ON enrichment_cache (cache_type)"))

    # -------------------- Outbox messages --------------------
    if "outbox_messages" not in tables:
        if engine.dialect.name == "sqlite":
            create_outbox_sql = (
                "CREATE TABLE outbox_messages ("
                "id TEXT PRIMARY KEY, "
                "channel TEXT NOT NULL CHECK(channel IN ('email','sms')), "
                "to_address TEXT NOT NULL, "
                "subject TEXT, "
                "body_html TEXT, "
                "body_text TEXT, "
                "payload JSON NOT NULL DEFAULT '{}', "
                "status TEXT NOT NULL DEFAULT 'queued', "
                "provider TEXT, "
                "provider_message_id TEXT, "
                "error TEXT, "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
                "queued_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
                "sent_at DATETIME, "
                "delivered_at DATETIME"
                ")"
            )
        else:
            create_outbox_sql = (
                "CREATE TABLE outbox_messages ("
                "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                "channel TEXT NOT NULL CHECK(channel IN ('email','sms')), "
                "to_address TEXT NOT NULL, "
                "subject TEXT, "
                "body_html TEXT, "
                "body_text TEXT, "
                "payload JSONB NOT NULL DEFAULT '{}'::jsonb, "
                "status TEXT NOT NULL DEFAULT 'queued', "
                "provider TEXT, "
                "provider_message_id TEXT, "
                "error TEXT, "
                "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
                "queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
                "sent_at TIMESTAMP WITH TIME ZONE, "
                "delivered_at TIMESTAMP WITH TIME ZONE"
                ")"
            )
        with engine.begin() as connection:
            connection.execute(text(create_outbox_sql))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_outbox_messages_status ON outbox_messages (status)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_outbox_messages_created_at ON outbox_messages (created_at)"))
    else:
        existing_outbox = {column["name"] for column in inspector.get_columns("outbox_messages")}
        alter_statements = {
            "to_address": "ALTER TABLE outbox_messages ADD COLUMN to_address TEXT",
            "subject": "ALTER TABLE outbox_messages ADD COLUMN subject TEXT",
            "body_html": "ALTER TABLE outbox_messages ADD COLUMN body_html TEXT",
            "body_text": "ALTER TABLE outbox_messages ADD COLUMN body_text TEXT",
            "payload": (
                "ALTER TABLE outbox_messages ADD COLUMN payload JSONB NOT NULL DEFAULT '{}'::jsonb"
                if engine.dialect.name != "sqlite"
                else "ALTER TABLE outbox_messages ADD COLUMN payload JSON NOT NULL DEFAULT '{}'"
            ),
            "status": "ALTER TABLE outbox_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'queued'",
            "provider": "ALTER TABLE outbox_messages ADD COLUMN provider TEXT",
            "provider_message_id": "ALTER TABLE outbox_messages ADD COLUMN provider_message_id TEXT",
            "error": "ALTER TABLE outbox_messages ADD COLUMN error TEXT",
            "queued_at": (
                "ALTER TABLE outbox_messages ADD COLUMN queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
                if engine.dialect.name != "sqlite"
                else "ALTER TABLE outbox_messages ADD COLUMN queued_at DATETIME DEFAULT CURRENT_TIMESTAMP"
            ),
            "sent_at": (
                "ALTER TABLE outbox_messages ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE"
                if engine.dialect.name != "sqlite"
                else "ALTER TABLE outbox_messages ADD COLUMN sent_at DATETIME"
            ),
            "delivered_at": (
                "ALTER TABLE outbox_messages ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE"
                if engine.dialect.name != "sqlite"
                else "ALTER TABLE outbox_messages ADD COLUMN delivered_at DATETIME"
            ),
        }
        with engine.begin() as connection:
            for column_name, ddl in alter_statements.items():
                if column_name not in existing_outbox:
                    connection.execute(text(ddl))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_outbox_messages_status ON outbox_messages (status)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_outbox_messages_created_at ON outbox_messages (created_at)"))

    # -------------------- Message events --------------------
    if "message_events" not in tables:
        if engine.dialect.name == "sqlite":
            create_events_sql = (
                "CREATE TABLE message_events ("
                "id TEXT PRIMARY KEY, "
                "message_id TEXT REFERENCES outbox_messages(id) ON DELETE CASCADE, "
                "type TEXT NOT NULL CHECK(type IN ('queued','sent','delivered','opened','clicked','bounced','failed')), "
                "meta JSON NOT NULL DEFAULT '{}', "
                "occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        else:
            create_events_sql = (
                "CREATE TABLE message_events ("
                "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                "message_id UUID REFERENCES outbox_messages(id) ON DELETE CASCADE, "
                "type TEXT NOT NULL CHECK(type IN ('queued','sent','delivered','opened','clicked','bounced','failed')), "
                "meta JSONB NOT NULL DEFAULT '{}'::jsonb, "
                "occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
    with engine.begin() as connection:
        connection.execute(text(create_events_sql))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_message_events_message_id ON message_events (message_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_message_events_type ON message_events (type)"))

    # -------------------- Wallet promotions --------------------
    if "wallet_promotions" not in tables:
        if engine.dialect.name == "sqlite":
            create_promotions_sql = (
                "CREATE TABLE wallet_promotions ("
                "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                "user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, "
                "code VARCHAR(32) NOT NULL UNIQUE, "
                "multiplier REAL NOT NULL DEFAULT 1.0, "
                "reward_type VARCHAR(64) NOT NULL, "
                "trigger_source VARCHAR(64) NOT NULL, "
                "status VARCHAR(32) NOT NULL DEFAULT 'active', "
                "metadata JSON, "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
                "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, "
                "expires_at DATETIME, "
                "redeemed_at DATETIME, "
                "locked_at DATETIME, "
                "viewed_at DATETIME, "
                "extension_count INTEGER NOT NULL DEFAULT 0, "
                "triggered_level INTEGER, "
                "extension_sent_at DATETIME, "
                "last_notification_at DATETIME, "
                "lock_amount REAL, "
                "status_reason VARCHAR(200)"
                ")"
            )
        else:
            create_promotions_sql = (
                "CREATE TABLE wallet_promotions ("
                "id SERIAL PRIMARY KEY, "
                "user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, "
                "code VARCHAR(32) NOT NULL UNIQUE, "
                "multiplier REAL NOT NULL DEFAULT 1.0, "
                "reward_type VARCHAR(64) NOT NULL, "
                "trigger_source VARCHAR(64) NOT NULL, "
                "status VARCHAR(32) NOT NULL DEFAULT 'active', "
                "metadata JSONB, "
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                "expires_at TIMESTAMP, "
                "redeemed_at TIMESTAMP, "
                "locked_at TIMESTAMP, "
                "viewed_at TIMESTAMP, "
                "extension_count INTEGER NOT NULL DEFAULT 0, "
                "triggered_level INTEGER, "
                "extension_sent_at TIMESTAMP, "
                "last_notification_at TIMESTAMP, "
                "lock_amount DOUBLE PRECISION, "
                "status_reason VARCHAR(200)"
                ")"
            )
        with engine.begin() as connection:
            connection.execute(text(create_promotions_sql))
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_wallet_promotions_code ON wallet_promotions (code)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_wallet_promotions_user ON wallet_promotions (user_id)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_wallet_promotions_status ON wallet_promotions (status)"))
    else:
        existing_promotions = {column["name"] for column in inspector.get_columns("wallet_promotions")}
        metadata_column = (
            "ALTER TABLE wallet_promotions ADD COLUMN metadata JSONB"
            if engine.dialect.name != "sqlite"
            else "ALTER TABLE wallet_promotions ADD COLUMN metadata JSON"
        )
        promotions_columns = {
            "trigger_source": "ALTER TABLE wallet_promotions ADD COLUMN trigger_source VARCHAR(64) NOT NULL DEFAULT 'level_up'",
            "status": "ALTER TABLE wallet_promotions ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'active'",
            "metadata": metadata_column,
            "extension_count": "ALTER TABLE wallet_promotions ADD COLUMN extension_count INTEGER NOT NULL DEFAULT 0",
            "triggered_level": "ALTER TABLE wallet_promotions ADD COLUMN triggered_level INTEGER",
            "extension_sent_at": "ALTER TABLE wallet_promotions ADD COLUMN extension_sent_at DATETIME",
            "last_notification_at": "ALTER TABLE wallet_promotions ADD COLUMN last_notification_at DATETIME",
            "lock_amount": "ALTER TABLE wallet_promotions ADD COLUMN lock_amount REAL",
            "status_reason": "ALTER TABLE wallet_promotions ADD COLUMN status_reason VARCHAR(200)",
            "viewed_at": "ALTER TABLE wallet_promotions ADD COLUMN viewed_at DATETIME",
            "locked_at": "ALTER TABLE wallet_promotions ADD COLUMN locked_at DATETIME",
            "redeemed_at": "ALTER TABLE wallet_promotions ADD COLUMN redeemed_at DATETIME",
            "expires_at": "ALTER TABLE wallet_promotions ADD COLUMN expires_at DATETIME",
        }
        if engine.dialect.name != "sqlite":
            promotions_columns["lock_amount"] = "ALTER TABLE wallet_promotions ADD COLUMN lock_amount DOUBLE PRECISION"
            promotions_columns["extension_sent_at"] = "ALTER TABLE wallet_promotions ADD COLUMN extension_sent_at TIMESTAMP"
            promotions_columns["last_notification_at"] = "ALTER TABLE wallet_promotions ADD COLUMN last_notification_at TIMESTAMP"
            promotions_columns["viewed_at"] = "ALTER TABLE wallet_promotions ADD COLUMN viewed_at TIMESTAMP"
            promotions_columns["locked_at"] = "ALTER TABLE wallet_promotions ADD COLUMN locked_at TIMESTAMP"
            promotions_columns["redeemed_at"] = "ALTER TABLE wallet_promotions ADD COLUMN redeemed_at TIMESTAMP"
            promotions_columns["expires_at"] = "ALTER TABLE wallet_promotions ADD COLUMN expires_at TIMESTAMP"
        with engine.begin() as connection:
            for column_name, ddl in promotions_columns.items():
                if column_name not in existing_promotions:
                    connection.execute(text(ddl))
    # -------------------- Contractor prospects --------------------
    if "contractor_prospects" not in tables:
        if engine.dialect.name == "sqlite":
            create_cp_sql = (
                "CREATE TABLE contractor_prospects ("
                "id TEXT PRIMARY KEY, "
                "company_name TEXT NOT NULL, "
                "contact_name TEXT, "
                "email TEXT, "
                "phone TEXT, "
                "website TEXT, "
                "address TEXT, "
                "city TEXT, "
                "state TEXT, "
                "postal_code TEXT, "
                "source TEXT NOT NULL, "
                "identity_hash TEXT NOT NULL UNIQUE, "
                "score REAL, "
                "tags JSON NOT NULL DEFAULT '{}', "
                "enriched JSON NOT NULL DEFAULT '{}', "
                "status TEXT NOT NULL DEFAULT 'new', "
                "sequence_stage INTEGER NOT NULL DEFAULT 0, "
                "first_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                "last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                "last_contacted_at DATETIME, "
                "next_contact_at DATETIME, "
                "reply_status TEXT, "
                "last_reply_at DATETIME, "
                "metadata JSON NOT NULL DEFAULT '{}'"
                ")"
            )
        else:
            create_cp_sql = (
                "CREATE TABLE contractor_prospects ("
                "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                "company_name TEXT NOT NULL, "
                "contact_name TEXT, "
                "email TEXT, "
                "phone TEXT, "
                "website TEXT, "
                "address TEXT, "
                "city TEXT, "
                "state TEXT, "
                "postal_code TEXT, "
                "source TEXT NOT NULL, "
                "identity_hash TEXT NOT NULL UNIQUE, "
                "score NUMERIC, "
                "tags JSONB NOT NULL DEFAULT '{}'::jsonb, "
                "enriched JSONB NOT NULL DEFAULT '{}'::jsonb, "
                "status TEXT NOT NULL DEFAULT 'new', "
                "sequence_stage INTEGER NOT NULL DEFAULT 0, "
                "first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                "last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                "last_contacted_at TIMESTAMP WITH TIME ZONE, "
                "next_contact_at TIMESTAMP WITH TIME ZONE, "
                "reply_status TEXT, "
                "last_reply_at TIMESTAMP WITH TIME ZONE, "
                "metadata JSONB NOT NULL DEFAULT '{}'::jsonb"
                ")"
            )
        with engine.begin() as connection:
            connection.execute(text(create_cp_sql))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_contractor_prospects_status ON contractor_prospects (status)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_contractor_prospects_city_state ON contractor_prospects (city, state)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_contractor_prospects_score ON contractor_prospects (score)"))

    if "contractor_prospect_events" not in tables:
        if engine.dialect.name == "sqlite":
            create_cpe_sql = (
                "CREATE TABLE contractor_prospect_events ("
                "id TEXT PRIMARY KEY, "
                "prospect_id TEXT NOT NULL REFERENCES contractor_prospects(id) ON DELETE CASCADE, "
                "type TEXT NOT NULL, "
                "payload JSON NOT NULL DEFAULT '{}', "
                "occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        else:
            create_cpe_sql = (
                "CREATE TABLE contractor_prospect_events ("
                "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                "prospect_id UUID NOT NULL REFERENCES contractor_prospects(id) ON DELETE CASCADE, "
                "type TEXT NOT NULL, "
                "payload JSONB NOT NULL DEFAULT '{}'::jsonb, "
                "occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        with engine.begin() as connection:
            connection.execute(text(create_cpe_sql))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_contractor_prospect_events_prospect ON contractor_prospect_events (prospect_id)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_contractor_prospect_events_type ON contractor_prospect_events (type)"))
    else:
        existing_message_events = {column["name"] for column in inspector.get_columns("message_events")}
        with engine.begin() as connection:
            if "meta" not in existing_message_events:
                connection.execute(
                    text(
                        "ALTER TABLE message_events ADD COLUMN meta "
                        + ("JSONB NOT NULL DEFAULT '{}'::jsonb" if engine.dialect.name != "sqlite" else "JSON NOT NULL DEFAULT '{}'" )
                    )
                )
            if "occurred_at" not in existing_message_events:
                connection.execute(
                    text(
                        "ALTER TABLE message_events ADD COLUMN occurred_at "
                        + ("TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP"
                           if engine.dialect.name != "sqlite"
                           else "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP")
                    )
                )
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_message_events_message_id ON message_events (message_id)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_message_events_type ON message_events (type)"))
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_public_shares_token ON public_shares (token)"))

    if "marketing_signups" not in tables:
        with engine.begin() as connection:
            if engine.dialect.name == "sqlite":
                connection.execute(
                    text(
                        """
                        CREATE TABLE marketing_signups (
                            id TEXT PRIMARY KEY,
                            name TEXT NOT NULL,
                            email TEXT NOT NULL,
                            phone TEXT,
                            company TEXT NOT NULL,
                            city TEXT,
                            state TEXT,
                            country TEXT,
                            source TEXT,
                            medium TEXT,
                            campaign TEXT,
                            notes TEXT,
                            ip TEXT,
                            user_agent TEXT,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                        """
                    )
                )
            else:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
                connection.execute(
                    text(
                        """
                        CREATE TABLE marketing_signups (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            name TEXT NOT NULL,
                            email TEXT NOT NULL,
                            phone TEXT,
                            company TEXT NOT NULL,
                            city TEXT,
                            state TEXT,
                            country TEXT,
                            source TEXT,
                            medium TEXT,
                            campaign TEXT,
                            notes TEXT,
                            ip INET,
                            user_agent TEXT,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_marketing_signups_created_at ON marketing_signups (created_at)"
                )
            )


try:
    _ensure_schema()
except Exception:
    # Database might not be ready yet (during initial migration setup).
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
