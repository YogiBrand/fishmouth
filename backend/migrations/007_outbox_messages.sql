-- Migration 007: Outbox messaging tables
CREATE TABLE IF NOT EXISTS outbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL CHECK (channel IN ('email','sms')),
    to_address TEXT NOT NULL,
    subject TEXT,
    body_html TEXT,
    body_text TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued',
    provider TEXT,
    provider_message_id TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_outbox_messages_status ON outbox_messages(status);
CREATE INDEX IF NOT EXISTS ix_outbox_messages_created_at ON outbox_messages(created_at);

CREATE TABLE IF NOT EXISTS message_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES outbox_messages(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('queued','sent','delivered','opened','clicked','bounced','failed')),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_message_events_message_id ON message_events(message_id);
CREATE INDEX IF NOT EXISTS ix_message_events_type ON message_events(type);
