"""Create templates table for scoped message content.

Revision ID: 005_templates_table
Revises: 004_enhanced_roof_intelligence
Create Date: 2025-03-17 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "005_templates_table"
down_revision: str = "004_enhanced_roof_intelligence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "templates",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("scope", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_check_constraint(
        "templates_scope_check",
        "templates",
        "scope IN ('report','email','sms')",
    )


def downgrade() -> None:
    op.drop_constraint("templates_scope_check", "templates", type_="check")
    op.drop_table("templates")
