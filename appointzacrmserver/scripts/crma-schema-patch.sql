-- Optional patches if your crma DB was created before Connect parity on appointzacrmserver.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE leads ADD COLUMN IF NOT EXISTS facebook_psid varchar DEFAULT '';

ALTER TABLE channel_configurations ADD COLUMN IF NOT EXISTS facebook_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE channel_configurations ADD COLUMN IF NOT EXISTS google_api_key TEXT;

CREATE TABLE IF NOT EXISTS facebook_inbound_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid,
    page_id varchar DEFAULT '',
    sender_id varchar DEFAULT '',
    message_type varchar DEFAULT 'text',
    text_body text DEFAULT '',
    fb_message_id varchar DEFAULT '',
    event_type varchar DEFAULT 'message',
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facebook_inbound_messages_org ON facebook_inbound_messages (organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_inbound_messages_sender ON facebook_inbound_messages (sender_id);
