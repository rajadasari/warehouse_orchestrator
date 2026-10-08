-- ===========================================================================
-- V27: Ensure UDT hierarchy columns exist (idempotent)
-- Added to fix schema validation after migration renaming
-- ===========================================================================

ALTER TABLE wo.network_device_tag
    ADD COLUMN IF NOT EXISTS parent_tag_id UUID NULL REFERENCES wo.network_device_tag(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_udt BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_udt_member BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS member_path VARCHAR(250) NULL;

CREATE INDEX IF NOT EXISTS idx_wo_net_tag_parent ON wo.network_device_tag(parent_tag_id);
