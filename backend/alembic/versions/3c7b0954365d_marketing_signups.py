"""Create marketing_signups table for lead giveaway captures

Revision ID: 3c7b0954365d
Revises: 98749b645d64
Create Date: 2025-01-15 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3c7b0954365d'
down_revision = '98749b645d64'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        'marketing_signups',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('company', sa.String(length=140), nullable=False),
        sa.Column('city', sa.String(length=120), nullable=True),
        sa.Column('state', sa.String(length=120), nullable=True),
        sa.Column('country', sa.String(length=120), nullable=True),
        sa.Column('source', sa.String(length=120), nullable=True),
        sa.Column('medium', sa.String(length=120), nullable=True),
        sa.Column('campaign', sa.String(length=120), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('ip', postgresql.INET(), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_index(
        'idx_marketing_signups_created_at',
        'marketing_signups',
        ['created_at'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('idx_marketing_signups_created_at', table_name='marketing_signups')
    op.drop_table('marketing_signups')
