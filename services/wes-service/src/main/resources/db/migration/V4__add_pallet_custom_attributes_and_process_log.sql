-- ============================================================================
-- V4: Add 'PALLET' scope to custom_attribute_definition,
--     add custom_attributes JSONB to wes.pallet, and
--     create wes.pallet_process_log for append-only journey audit tracking.
-- ============================================================================

-- 1. Enable 'PALLET' as an allowable target entity in custom attribute definitions
ALTER TABLE wes.custom_attribute_definition 
    DROP CONSTRAINT IF EXISTS chk_target_entity;

ALTER TABLE wes.custom_attribute_definition 
    ADD CONSTRAINT chk_target_entity 
    CHECK (target_entity IN ('ITEM', 'SKU', 'HANDLING_STRATEGY', 'PALLET'));

-- 2. Add custom_attributes JSONB to wes.pallet for active property accumulation
ALTER TABLE wes.pallet 
    ADD COLUMN IF NOT EXISTS custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_pallet_custom_attrs_gin 
    ON wes.pallet USING GIN (custom_attributes jsonb_path_ops);

-- 3. Create the append-only Pallet Process Log table
CREATE TABLE IF NOT EXISTS wes.pallet_process_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pallet_id UUID NOT NULL REFERENCES wes.pallet(id) ON DELETE CASCADE,
    pallet_lpn VARCHAR(60) NOT NULL,
    process_stage VARCHAR(10) NOT NULL,     -- Concise code text e.g. 'INBOUND', 'SCALE', 'ROUTED', 'STORED', 'DISPATCH'
    location VARCHAR(100),                  -- Location checkpoint e.g. 'DOCK-01', 'SCALE-01', 'RACK-A-12-04'
    status VARCHAR(30),                     -- Status at this stage e.g. 'STAGED', 'IN_ASRS', 'LOADED'
    properties_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb, -- Point-in-time properties & sensor telemetry
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast B-Tree index for pallet journey history timeline queries
CREATE INDEX IF NOT EXISTS idx_pallet_process_log_pallet_time 
    ON wes.pallet_process_log (pallet_id, created_at DESC);

-- GIN index for sensor/property filtering
CREATE INDEX IF NOT EXISTS idx_pallet_process_log_props_gin 
    ON wes.pallet_process_log USING GIN (properties_snapshot jsonb_path_ops);
