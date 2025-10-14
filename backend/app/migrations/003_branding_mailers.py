"""Branding assets and direct mail infrastructure

Revision ID: 003_branding_mailers
Revises: 002_contagion
Create Date: 2025-10-13 12:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "003_branding_mailers"
down_revision = "002_contagion"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contractors", sa.Column("brand_palette", sa.JSON(), nullable=True))
    op.add_column("contractors", sa.Column("showcase_url", sa.String(length=500), nullable=True))
    op.add_column("contractors", sa.Column("direct_mail_enabled", sa.Boolean(), server_default=sa.text("false")))
    op.add_column("contractors", sa.Column("preferred_mail_templates", sa.JSON(), nullable=True))
    op.add_column("contractors", sa.Column("marketing_contact_email", sa.String(length=255), nullable=True))
    op.add_column("contractors", sa.Column("marketing_contact_phone", sa.String(length=50), nullable=True))

    op.create_table(
        "contractor_showcases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("contractor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contractors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False, unique=True),
        sa.Column("share_url", sa.String(length=500), nullable=False),
        sa.Column("theme", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("last_generated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "mail_campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("contractor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contractors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("template_key", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), server_default=sa.text("'draft'")),
        sa.Column("settings", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("scheduled_for", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "mail_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("mail_campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient_name", sa.String(length=150), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("state", sa.String(length=2), nullable=False),
        sa.Column("postal_code", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=50), server_default=sa.text("'queued'")),
        sa.Column("provider_job_id", sa.String(length=100), nullable=True),
        sa.Column("cost_usd", sa.Numeric(6, 2), nullable=True),
        sa.Column("scheduled_for", sa.DateTime(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
    )
    op.create_index("idx_mail_jobs_campaign", "mail_jobs", ["campaign_id"])
    op.create_index("idx_mail_jobs_lead", "mail_jobs", ["property_id"])


def downgrade() -> None:
    op.drop_index("idx_mail_jobs_lead", table_name="mail_jobs")
    op.drop_index("idx_mail_jobs_campaign", table_name="mail_jobs")
    op.drop_table("mail_jobs")

    op.drop_table("mail_campaigns")

    op.drop_table("contractor_showcases")

    op.drop_column("contractors", "marketing_contact_phone")
    op.drop_column("contractors", "marketing_contact_email")
    op.drop_column("contractors", "preferred_mail_templates")
    op.drop_column("contractors", "direct_mail_enabled")
    op.drop_column("contractors", "showcase_url")
    op.drop_column("contractors", "brand_palette")
