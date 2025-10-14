"""Add enhanced roof intelligence fields to leads.

Revision ID: 004_enhanced_roof_intelligence
Revises: 003_branding_mailers
Create Date: 2025-10-14 10:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "004_enhanced_roof_intelligence"
down_revision: str = "003_branding_mailers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("image_quality_score", sa.Float(), nullable=True))
    op.add_column("leads", sa.Column("image_quality_issues", sa.JSON(), nullable=True))
    op.add_column(
        "leads",
        sa.Column(
            "quality_validation_status",
            sa.String(length=32),
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column("leads", sa.Column("roof_intelligence", sa.JSON(), nullable=True))
    op.add_column("leads", sa.Column("street_view_quality", sa.JSON(), nullable=True))
    op.alter_column("leads", "quality_validation_status", server_default=None)


def downgrade() -> None:
    op.drop_column("leads", "street_view_quality")
    op.drop_column("leads", "roof_intelligence")
    op.drop_column("leads", "quality_validation_status")
    op.drop_column("leads", "image_quality_issues")
    op.drop_column("leads", "image_quality_score")
