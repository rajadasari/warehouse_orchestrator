-- ============================================================================
-- V7: Create wes.resource table for managing internal and external resources
--     (e.g., Logiqs Ambient WMS, Software, Hardware, IP, PLC configurations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wes.resource (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,              -- e.g. 'SOFTWARE', 'HARDWARE', 'EQUIPMENT', 'PLC', 'WMS'
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- e.g. 'ACTIVE', 'INACTIVE', 'MAINTENANCE'
    custom_properties JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"ip": "192.168.1.100", "port": 8089}
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_resource_type ON wes.resource(type);
CREATE INDEX IF NOT EXISTS idx_resource_status ON wes.resource(status);
CREATE INDEX IF NOT EXISTS idx_resource_custom_props_gin ON wes.resource USING GIN (custom_properties jsonb_path_ops);

-- Initial seed: Logiqs Ambient WMS
INSERT INTO wes.resource (resource_id, name, type, status, custom_properties)
VALUES (
    'LOGIQS-AMBIENT-WMS',
    'Logiqs Ambient WMS',
    'SOFTWARE',
    'ACTIVE',
    '{"ip": "192.168.1.100", "description": "Third-Party Ambient Warehouse Management System"}'::jsonb
) ON CONFLICT (resource_id) DO NOTHING;
