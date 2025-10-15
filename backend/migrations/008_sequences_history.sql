-- Migration 008: Sequences v1 core tables
-- Ensures sequences, nodes, enrollments, and history tables exist for PRD-04.

-- Sequences master table
CREATE TABLE IF NOT EXISTS sequences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    flow_data JSONB,
    working_hours_start TEXT DEFAULT '09:00',
    working_hours_end TEXT DEFAULT '17:00',
    working_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb,
    timezone TEXT DEFAULT 'America/New_York',
    total_enrolled INTEGER NOT NULL DEFAULT 0,
    total_completed INTEGER NOT NULL DEFAULT 0,
    total_converted INTEGER NOT NULL DEFAULT 0,
    conversion_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sequences ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS flow_data JSONB;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS working_hours_start TEXT DEFAULT '09:00';
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS working_hours_end TEXT DEFAULT '17:00';
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS total_enrolled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS total_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS total_converted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS conversion_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS ix_sequences_user_id ON sequences(user_id);

-- Flow node definitions
CREATE TABLE IF NOT EXISTS sequence_nodes (
    id SERIAL PRIMARY KEY,
    sequence_id INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    position_x DOUBLE PRECISION DEFAULT 0,
    position_y DOUBLE PRECISION DEFAULT 0,
    config JSONB DEFAULT '{}'::jsonb,
    ai_instructions TEXT,
    next_nodes JSONB,
    condition_rules JSONB,
    execution_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sequence_nodes ADD COLUMN IF NOT EXISTS next_nodes JSONB;
ALTER TABLE sequence_nodes ADD COLUMN IF NOT EXISTS condition_rules JSONB;
ALTER TABLE sequence_nodes ADD COLUMN IF NOT EXISTS execution_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequence_nodes ADD COLUMN IF NOT EXISTS success_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequence_nodes ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequence_nodes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sequence_nodes_identifier ON sequence_nodes(sequence_id, node_id);

-- Enrollments representing lead progress through a sequence
CREATE TABLE IF NOT EXISTS sequence_enrollments (
    id SERIAL PRIMARY KEY,
    sequence_id INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    current_node_id TEXT,
    steps_completed INTEGER NOT NULL DEFAULT 0,
    next_execution_at TIMESTAMP WITH TIME ZONE,
    last_execution_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    conversion_outcome TEXT,
    emails_sent INTEGER NOT NULL DEFAULT 0,
    sms_sent INTEGER NOT NULL DEFAULT 0,
    calls_made INTEGER NOT NULL DEFAULT 0,
    emails_opened INTEGER NOT NULL DEFAULT 0,
    emails_clicked INTEGER NOT NULL DEFAULT 0,
    converted BOOLEAN NOT NULL DEFAULT FALSE,
    conversion_date TIMESTAMP WITH TIME ZONE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS steps_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS next_execution_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS last_execution_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS conversion_outcome TEXT;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS emails_sent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS sms_sent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS calls_made INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS emails_opened INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS emails_clicked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS converted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS ix_sequence_enrollments_status ON sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS ix_sequence_enrollments_next_execution ON sequence_enrollments(next_execution_at);

-- History log capturing every executed step, schedule, or event trigger
CREATE TABLE IF NOT EXISTS sequence_history (
    id SERIAL PRIMARY KEY,
    sequence_id INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    enrollment_id INTEGER NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
    node_id TEXT,
    step_type TEXT,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    result JSONB DEFAULT '{}'::jsonb,
    error TEXT,
    event_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_sequence_history_sequence ON sequence_history(sequence_id);
CREATE INDEX IF NOT EXISTS ix_sequence_history_enrollment ON sequence_history(enrollment_id);
CREATE INDEX IF NOT EXISTS ix_sequence_history_created_at ON sequence_history(created_at);
