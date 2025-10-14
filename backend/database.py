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
        }
        with engine.begin() as connection:
            for column_name, ddl in user_columns.items():
                if column_name not in existing_users:
                    connection.execute(text(ddl))

    # -------------------- Leads --------------------
    if "leads" in tables:
        existing_leads = {column["name"] for column in inspector.get_columns("leads")}
        lead_columns = {
            "discovery_status": "ALTER TABLE leads ADD COLUMN discovery_status VARCHAR NOT NULL DEFAULT 'completed'",
            "imagery_status": "ALTER TABLE leads ADD COLUMN imagery_status VARCHAR NOT NULL DEFAULT 'synthetic'",
            "property_enrichment_status": "ALTER TABLE leads ADD COLUMN property_enrichment_status VARCHAR NOT NULL DEFAULT 'synthetic'",
            "contact_enrichment_status": "ALTER TABLE leads ADD COLUMN contact_enrichment_status VARCHAR NOT NULL DEFAULT 'synthetic'",
            "voice_opt_out": "ALTER TABLE leads ADD COLUMN voice_opt_out BOOLEAN NOT NULL DEFAULT 0",
            "voice_opt_out_reason": "ALTER TABLE leads ADD COLUMN voice_opt_out_reason VARCHAR",
            "voice_consent_updated_at": "ALTER TABLE leads ADD COLUMN voice_consent_updated_at DATETIME",
            "last_voice_contacted": "ALTER TABLE leads ADD COLUMN last_voice_contacted DATETIME",
            "homeowner_email_hash": "ALTER TABLE leads ADD COLUMN homeowner_email_hash VARCHAR",
            "homeowner_phone_hash": "ALTER TABLE leads ADD COLUMN homeowner_phone_hash VARCHAR",
            "homeowner_email_encrypted": "ALTER TABLE leads ADD COLUMN homeowner_email_encrypted TEXT",
            "homeowner_phone_encrypted": "ALTER TABLE leads ADD COLUMN homeowner_phone_encrypted TEXT",
        }
        with engine.begin() as connection:
            for column_name, ddl in lead_columns.items():
                if column_name not in existing_leads:
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





