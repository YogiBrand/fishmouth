"""Add contagion scoring model

Revision ID: 002_contagion
Revises: 6eef61f13528
Create Date: 2025-10-12 14:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "002_contagion"
down_revision: str = "6eef61f13528"
branch_labels = None
depends_on = None


def _is_postgres() -> bool:
    bind = op.get_bind()
    return bind.dialect.name == "postgresql"


def upgrade() -> None:
    if _is_postgres():
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "contractors",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("company_name", sa.String(200), nullable=False),
        sa.Column("contact_name", sa.String(150)),
        sa.Column("phone", sa.String(50)),
        sa.Column("email", sa.String(255)),
        sa.Column("license_number", sa.String(100)),
        sa.Column("website", sa.String(255)),
        sa.Column("logo_url", sa.String(500)),
        sa.Column("address", sa.String(255)),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "properties",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("address", sa.String(255), nullable=False),
        sa.Column("street_number", sa.String(50)),
        sa.Column("street_name", sa.String(150)),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(2), nullable=False),
        sa.Column("zip_code", sa.String(10), nullable=False),
        sa.Column("subdivision_name", sa.String(200)),
        sa.Column("parcel_id", sa.String(100)),
        sa.Column("latitude", sa.Numeric(10, 8)),
        sa.Column("longitude", sa.Numeric(11, 8)),
        sa.Column("lot_size_sqft", sa.Integer()),
        sa.Column("year_built", sa.Integer()),
        sa.Column("estimated_value", sa.Numeric(12, 2)),
        sa.Column("equity_percent", sa.Numeric(5, 2)),
        sa.Column("has_mortgage", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("has_liens", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("recent_refinance", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("recent_heloc", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("roof_age_years", sa.Integer()),
        sa.Column("roof_material", sa.String(100)),
        sa.Column("owner_name", sa.String(150)),
        sa.Column("owner_phone", sa.String(50)),
        sa.Column("owner_email", sa.String(255)),
        sa.Column("lead_status", sa.String(50), server_default=sa.text("'new'")),
        sa.Column("appointment_date", sa.DateTime()),
        sa.Column("last_contacted_at", sa.DateTime()),
        sa.Column("tags", sa.JSON()),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_properties_city", "properties", ["city"])
    op.create_index("ix_properties_state", "properties", ["state"])
    op.create_index("ix_properties_zip", "properties", ["zip_code"])
    op.create_index("ix_properties_lead_status", "properties", ["lead_status"])

    if _is_postgres():
        op.execute("ALTER TABLE properties ADD COLUMN geom geography(POINT, 4326)")
        op.execute("CREATE INDEX idx_properties_geom ON properties USING GIST(geom)")

    op.create_table(
        "building_permits",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("address", sa.String(255), nullable=False),
        sa.Column("street_number", sa.String(50)),
        sa.Column("street_name", sa.String(150)),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(2), nullable=False),
        sa.Column("zip_code", sa.String(10), nullable=False),
        sa.Column("latitude", sa.Numeric(10, 8)),
        sa.Column("longitude", sa.Numeric(11, 8)),
        sa.Column("permit_number", sa.String(100), unique=True),
        sa.Column("permit_date", sa.Date(), nullable=False),
        sa.Column("permit_type", sa.String(100)),
        sa.Column("permit_value", sa.Numeric(10, 2)),
        sa.Column("contractor_name", sa.String(200)),
        sa.Column("contractor_license", sa.String(100)),
        sa.Column("work_description", sa.Text()),
        sa.Column("subdivision_name", sa.String(200)),
        sa.Column("parcel_id", sa.String(100)),
        sa.Column("source_url", sa.String(500)),
        sa.Column("scraped_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("verified", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_building_permits_city", "building_permits", ["city"])
    op.create_index("ix_building_permits_state", "building_permits", ["state"])
    op.create_index("ix_building_permits_zip", "building_permits", ["zip_code"])
    op.create_index("ix_building_permits_permit_date", "building_permits", ["permit_date"])

    if _is_postgres():
        op.execute("ALTER TABLE building_permits ADD COLUMN geom geography(POINT, 4326)")
        op.execute(
            "CREATE INDEX idx_building_permits_geom ON building_permits USING GIST(geom)"
        )

    op.create_table(
        "contagion_clusters",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(2), nullable=False),
        sa.Column("subdivision_name", sa.String(200)),
        sa.Column("center_latitude", sa.Numeric(10, 8)),
        sa.Column("center_longitude", sa.Numeric(11, 8)),
        sa.Column("radius_miles", sa.Numeric(5, 2), server_default=sa.text("0.25")),
        sa.Column("permit_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column("avg_permit_value", sa.Numeric(10, 2)),
        sa.Column("date_range_start", sa.Date()),
        sa.Column("date_range_end", sa.Date()),
        sa.Column("avg_year_built", sa.Integer()),
        sa.Column("cluster_score", sa.Integer()),
        sa.Column("cluster_status", sa.String(50)),
        sa.Column("properties_in_cluster", sa.Integer(), server_default=sa.text("0")),
        sa.Column("properties_scored", sa.Integer(), server_default=sa.text("0")),
        sa.Column("hot_leads_generated", sa.Integer(), server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("last_scored_at", sa.DateTime()),
        sa.Column("metadata", postgresql.JSONB()),
    )
    op.create_index("idx_cluster_location", "contagion_clusters", ["city", "state"])
    op.create_index("idx_cluster_score", "contagion_clusters", ["cluster_score"])

    if _is_postgres():
        op.execute(
            "ALTER TABLE contagion_clusters ADD COLUMN cluster_center geography(POINT, 4326)"
        )
        op.execute(
            "CREATE INDEX idx_cluster_center_geom ON contagion_clusters USING GIST(cluster_center)"
        )

    op.create_table(
        "property_scores",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "property_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("properties.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "cluster_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contagion_clusters.id", ondelete="SET NULL"),
        ),
        sa.Column("contagion_score", sa.Integer(), server_default=sa.text("0")),
        sa.Column("permits_within_quarter_mile", sa.Integer(), server_default=sa.text("0")),
        sa.Column("permits_within_500ft", sa.Integer(), server_default=sa.text("0")),
        sa.Column("permits_within_100ft", sa.Integer(), server_default=sa.text("0")),
        sa.Column("same_subdivision_permits", sa.Integer(), server_default=sa.text("0")),
        sa.Column("nearest_permit_distance_ft", sa.Integer()),
        sa.Column("nearest_permit_address", sa.String(255)),
        sa.Column("nearest_permit_date", sa.Date()),
        sa.Column("neighbor_contractor_names", postgresql.ARRAY(sa.String())),
        sa.Column("age_match_score", sa.Integer(), server_default=sa.text("0")),
        sa.Column("year_built", sa.Integer()),
        sa.Column("roof_age_years", sa.Integer()),
        sa.Column("matches_neighbor_age", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("age_difference_years", sa.Integer()),
        sa.Column("subdivision_avg_age", sa.Integer()),
        sa.Column("financial_score", sa.Integer(), server_default=sa.text("0")),
        sa.Column("home_value", sa.Numeric(10, 2)),
        sa.Column("estimated_equity_percent", sa.Numeric(5, 2)),
        sa.Column("estimated_equity_amount", sa.Numeric(10, 2)),
        sa.Column("owner_income_estimate", sa.Integer()),
        sa.Column("has_mortgage", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("has_liens", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("recent_refinance", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("recent_heloc", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("visual_score", sa.Integer(), server_default=sa.text("0")),
        sa.Column("has_aerial_analysis", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("aerial_image_url", sa.String(500)),
        sa.Column("claude_damage_assessment", sa.Text()),
        sa.Column("gpt4v_damage_assessment", sa.Text()),
        sa.Column("visible_damage_level", sa.String(50)),
        sa.Column("damage_indicators", postgresql.JSONB()),
        sa.Column("estimated_remaining_life_years", sa.Integer()),
        sa.Column("total_urgency_score", sa.Integer()),
        sa.Column("urgency_tier", sa.String(20)),
        sa.Column("confidence_level", sa.String(20)),
        sa.Column("recommended_action", sa.String(100)),
        sa.Column("scored_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("last_updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("scoring_version", sa.String(20), server_default=sa.text("'v1.0'")),
        sa.Column("data_sources_used", postgresql.JSONB()),
    )
    op.create_index("idx_property_score", "property_scores", ["property_id"])
    op.create_index("idx_urgency_score", "property_scores", ["total_urgency_score"])
    op.create_index("idx_urgency_tier", "property_scores", ["urgency_tier"])

    op.create_table(
        "social_proof_data",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "property_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("properties.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("neighbor_addresses", postgresql.ARRAY(sa.String())),
        sa.Column("neighbor_replacement_dates", postgresql.ARRAY(sa.Date())),
        sa.Column("neighbor_contractor_names", postgresql.ARRAY(sa.String())),
        sa.Column("neighbor_permit_values", postgresql.ARRAY(sa.Numeric())),
        sa.Column("hoa_name", sa.String(200)),
        sa.Column("nextdoor_activity_level", sa.String(50)),
        sa.Column("facebook_group_mentions", sa.Integer(), server_default=sa.text("0")),
        sa.Column("community_reputation_score", sa.Integer()),
        sa.Column("testimonials_nearby", postgresql.JSONB()),
        sa.Column("before_after_photos", postgresql.JSONB()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_social_proof_property", "social_proof_data", ["property_id"])

    op.create_table(
        "property_reports",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "property_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("properties.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "contractor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contractors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("report_type", sa.String(50)),
        sa.Column("report_title", sa.String(255)),
        sa.Column("pdf_url", sa.String(500)),
        sa.Column("pdf_file_size_kb", sa.Integer()),
        sa.Column("page_count", sa.Integer()),
        sa.Column("executive_summary", sa.Text()),
        sa.Column("damage_findings", postgresql.JSONB()),
        sa.Column("recommendations", postgresql.JSONB()),
        sa.Column("cost_estimates", postgresql.JSONB()),
        sa.Column("urgency_level", sa.String(50)),
        sa.Column("aerial_images", postgresql.JSONB()),
        sa.Column("damage_overlay_images", postgresql.JSONB()),
        sa.Column("street_view_comparison", postgresql.JSONB()),
        sa.Column("neighbor_examples", postgresql.JSONB()),
        sa.Column("contractor_logo_url", sa.String(500)),
        sa.Column("contractor_branding", postgresql.JSONB()),
        sa.Column("custom_message", sa.Text()),
        sa.Column("sent_to_homeowner", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("sent_at", sa.DateTime()),
        sa.Column("opened_at", sa.DateTime()),
        sa.Column("downloaded_at", sa.DateTime()),
        sa.Column("homeowner_response", sa.String(100)),
        sa.Column("generated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("generation_time_seconds", sa.Numeric(5, 2)),
        sa.Column("ai_model_used", sa.String(100)),
        sa.Column("view_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column("report_payload", postgresql.JSONB()),
    )
    op.create_index("idx_report_property", "property_reports", ["property_id"])
    op.create_index("idx_report_contractor", "property_reports", ["contractor_id"])
    op.create_index("idx_report_generated", "property_reports", ["generated_at"])

    op.create_table(
        "call_campaigns",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "contractor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contractors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("lead_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column("metadata", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "ai_calls",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "lead_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("properties.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "contractor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contractors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "campaign_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("call_campaigns.id", ondelete="SET NULL"),
        ),
        sa.Column("phone_number", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), server_default=sa.text("'initiated'")),
        sa.Column("duration_seconds", sa.Integer(), server_default=sa.text("0")),
        sa.Column("appointment_booked", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("outcome", sa.String(50)),
        sa.Column("metadata", postgresql.JSONB()),
        sa.Column("telnyx_call_id", sa.String(100)),
        sa.Column("vapi_session_id", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("answered_at", sa.DateTime()),
        sa.Column("completed_at", sa.DateTime()),
    )
    op.create_index("idx_ai_calls_lead", "ai_calls", ["lead_id"])
    op.create_index("idx_ai_calls_contractor", "ai_calls", ["contractor_id"])

    op.create_table(
        "scheduled_sms",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "lead_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("properties.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("send_at", sa.DateTime(), nullable=False),
        sa.Column("provider", sa.String(50), server_default=sa.text("'telnyx'")),
        sa.Column("delivery_status", sa.String(50), server_default=sa.text("'queued'")),
        sa.Column("telnyx_message_id", sa.String(100)),
        sa.Column("delivered_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_scheduled_sms_lead", "scheduled_sms", ["lead_id"])

    op.create_table(
        "follow_up_tasks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "lead_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("properties.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("task_type", sa.String(50), nullable=False),
        sa.Column("scheduled_for", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime()),
        sa.Column("metadata", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_follow_up_tasks_lead", "follow_up_tasks", ["lead_id"])


def downgrade() -> None:
    op.drop_index("idx_follow_up_tasks_lead", table_name="follow_up_tasks")
    op.drop_table("follow_up_tasks")

    op.drop_index("idx_scheduled_sms_lead", table_name="scheduled_sms")
    op.drop_table("scheduled_sms")

    op.drop_index("idx_ai_calls_contractor", table_name="ai_calls")
    op.drop_index("idx_ai_calls_lead", table_name="ai_calls")
    op.drop_table("ai_calls")

    op.drop_table("call_campaigns")

    op.drop_index("idx_report_generated", table_name="property_reports")
    op.drop_index("idx_report_contractor", table_name="property_reports")
    op.drop_index("idx_report_property", table_name="property_reports")
    op.drop_table("property_reports")

    op.drop_index("idx_social_proof_property", table_name="social_proof_data")
    op.drop_table("social_proof_data")

    op.drop_index("idx_urgency_tier", table_name="property_scores")
    op.drop_index("idx_urgency_score", table_name="property_scores")
    op.drop_index("idx_property_score", table_name="property_scores")
    op.drop_table("property_scores")

    if _is_postgres():
        op.execute("DROP INDEX IF EXISTS idx_cluster_center_geom")
    op.drop_index("idx_cluster_score", table_name="contagion_clusters")
    op.drop_index("idx_cluster_location", table_name="contagion_clusters")
    op.drop_table("contagion_clusters")

    if _is_postgres():
        op.execute("DROP INDEX IF EXISTS idx_building_permits_geom")
    op.drop_index("ix_building_permits_permit_date", table_name="building_permits")
    op.drop_index("ix_building_permits_zip", table_name="building_permits")
    op.drop_index("ix_building_permits_state", table_name="building_permits")
    op.drop_index("ix_building_permits_city", table_name="building_permits")
    op.drop_table("building_permits")

    if _is_postgres():
        op.execute("DROP INDEX IF EXISTS idx_properties_geom")
    op.drop_index("ix_properties_lead_status", table_name="properties")
    op.drop_index("ix_properties_zip", table_name="properties")
    op.drop_index("ix_properties_state", table_name="properties")
    op.drop_index("ix_properties_city", table_name="properties")
    op.drop_table("properties")

    op.drop_table("contractors")

    if _is_postgres():
        op.execute("DROP EXTENSION IF EXISTS postgis")
        op.execute("DROP EXTENSION IF EXISTS pgcrypto")
