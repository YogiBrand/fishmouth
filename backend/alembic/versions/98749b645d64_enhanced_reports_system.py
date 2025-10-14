"""enhanced_reports_system

Revision ID: 98749b645d64
Revises: 6eef61f13528
Create Date: 2024-10-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '98749b645d64'
down_revision = '6eef61f13528'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Reports table for storing report configurations and content
    op.create_table('reports',
        sa.Column('id', sa.VARCHAR(36), nullable=False),
        sa.Column('lead_id', sa.VARCHAR(36), nullable=False),
        sa.Column('type', sa.VARCHAR(50), nullable=False),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('content', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('business_profile', postgresql.JSONB(astext_type=sa.Text()), server_default='{}'),
        sa.Column('status', sa.VARCHAR(20), server_default='draft'),
        sa.Column('pdf_url', sa.VARCHAR(255)),
        sa.Column('share_url', sa.VARCHAR(255)),
        sa.Column('sent_at', sa.TIMESTAMP()),
        sa.Column('viewed_at', sa.TIMESTAMP()),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='CASCADE')
    )

    # AI content generations tracking
    op.create_table('ai_generations',
        sa.Column('id', sa.SERIAL(), nullable=False),
        sa.Column('section', sa.VARCHAR(100), nullable=False),
        sa.Column('prompt', sa.TEXT(), nullable=False),
        sa.Column('content', sa.TEXT(), nullable=False),
        sa.Column('report_id', sa.VARCHAR(36)),
        sa.Column('lead_id', sa.VARCHAR(36)),
        sa.Column('model_used', sa.VARCHAR(50), server_default='default'),
        sa.Column('generation_time_ms', sa.INTEGER()),
        sa.Column('tokens_used', sa.INTEGER()),
        sa.Column('cost_cents', sa.INTEGER()),
        sa.Column('quality_score', sa.FLOAT()),
        sa.Column('timestamp', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='SET NULL')
    )

    # Create indexes and triggers...


def downgrade() -> None:
    op.drop_table('ai_generations')
    op.drop_table('reports')
