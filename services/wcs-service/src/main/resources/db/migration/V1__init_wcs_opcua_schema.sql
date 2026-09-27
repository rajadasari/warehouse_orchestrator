-- ============================================================================
-- V1: WCS OPC UA Industrial Configuration, Tag Grouping, and Station Templates
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS wcs;

-- 1. OPC UA Client Configuration
CREATE TABLE IF NOT EXISTS wcs.opcua_client_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code VARCHAR(64) NOT NULL UNIQUE,
    endpoint_url VARCHAR(255) NOT NULL,
    security_policy VARCHAR(32) NOT NULL DEFAULT 'NONE',
    auth_type VARCHAR(32) NOT NULL DEFAULT 'ANONYMOUS',
    username VARCHAR(64),
    password_encrypted VARCHAR(255),
    keystore_path VARCHAR(255),
    certificate_alias VARCHAR(64),
    request_timeout_ms BIGINT NOT NULL DEFAULT 5000,
    session_timeout_ms BIGINT NOT NULL DEFAULT 60000,
    reconnect_interval_ms BIGINT NOT NULL DEFAULT 3000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. OPC UA Server Configuration
CREATE TABLE IF NOT EXISTS wcs.opcua_server_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_code VARCHAR(64) NOT NULL UNIQUE,
    bind_port INT NOT NULL DEFAULT 4840,
    endpoint_path VARCHAR(128) NOT NULL DEFAULT '/wcs/opcua',
    namespace_uri VARCHAR(255) NOT NULL DEFAULT 'urn:company:warehouse:wcs',
    supported_security_policies VARCHAR(255) NOT NULL DEFAULT 'NONE,BASIC256_SHA256',
    supported_auth_types VARCHAR(255) NOT NULL DEFAULT 'ANONYMOUS,USERNAME_PASSWORD',
    auto_start BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. OPC UA Tag Mapping
CREATE TABLE IF NOT EXISTS wcs.opcua_tag_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_key VARCHAR(64) NOT NULL UNIQUE,
    node_id VARCHAR(255) NOT NULL,
    data_type VARCHAR(32) NOT NULL DEFAULT 'STRING',
    access_level VARCHAR(16) NOT NULL DEFAULT 'READ_WRITE',
    equipment_code VARCHAR(64),
    client_code VARCHAR(64),
    server_code VARCHAR(64),
    sampling_interval_ms DOUBLE PRECISION NOT NULL DEFAULT 250.0,
    deadband DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tag Groups
CREATE TABLE IF NOT EXISTS wcs.opcua_tag_group (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_key VARCHAR(64) NOT NULL UNIQUE,
    description VARCHAR(255),
    equipment_code VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tag Group Items
CREATE TABLE IF NOT EXISTS wcs.opcua_tag_group_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES wcs.opcua_tag_group(id) ON DELETE CASCADE,
    tag_key VARCHAR(64) NOT NULL,
    display_order INT NOT NULL DEFAULT 0
);

-- 6. Handshake Flows
CREATE TABLE IF NOT EXISTS wcs.opcua_handshake_flow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    equipment_code VARCHAR(64),
    client_code VARCHAR(64),
    steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    timeout_ms BIGINT NOT NULL DEFAULT 5000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Station Sequence Templates (for Workflow Composer & AI Node Generation)
CREATE TABLE IF NOT EXISTS wcs.opcua_station_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(255),
    relative_tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    sequence_steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    output_variable VARCHAR(64) NOT NULL DEFAULT 'stationResult',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wcs_tag_equipment ON wcs.opcua_tag_mapping(equipment_code);
CREATE INDEX IF NOT EXISTS idx_wcs_tag_client ON wcs.opcua_tag_mapping(client_code);
CREATE INDEX IF NOT EXISTS idx_wcs_tag_server ON wcs.opcua_tag_mapping(server_code);
CREATE INDEX IF NOT EXISTS idx_wcs_group_equipment ON wcs.opcua_tag_group(equipment_code);
CREATE INDEX IF NOT EXISTS idx_wcs_flow_equipment ON wcs.opcua_handshake_flow(equipment_code);

-- Seed Default Server & Sample Station Template
INSERT INTO wcs.opcua_server_config (
    server_code, bind_port, endpoint_path, namespace_uri, supported_security_policies, supported_auth_types, auto_start, is_active
) VALUES (
    'WCS_VIRTUAL_SERVER', 4840, '/wcs/opcua', 'urn:company:warehouse:wcs', 'NONE,BASIC256_SHA256', 'ANONYMOUS,USERNAME_PASSWORD', true, true
) ON CONFLICT (server_code) DO NOTHING;

INSERT INTO wcs.opcua_station_template (
    template_code, name, description, relative_tags_json, sequence_steps_json, output_variable
) VALUES (
    'LOADING_STATION_TEMPLATE',
    'Conveyor Loading Station Sequence',
    'Standard loading station sequence with barcode scanning, weight check, lane routing, and PLC acknowledgement',
    '[
        {"tagKey": "PalletPresent", "dataType": "BOOLEAN", "accessLevel": "READ"},
        {"tagKey": "Barcode", "dataType": "STRING", "accessLevel": "READ"},
        {"tagKey": "WeightKg", "dataType": "DOUBLE", "accessLevel": "READ"},
        {"tagKey": "TargetLane", "dataType": "INT32", "accessLevel": "WRITE"},
        {"tagKey": "WcsAck", "dataType": "BOOLEAN", "accessLevel": "WRITE"},
        {"tagKey": "PlcDone", "dataType": "BOOLEAN", "accessLevel": "READ"}
    ]'::jsonb,
    '[
        {"stepOrder": 1, "stepType": "AWAIT_TRIGGER", "tagKey": "PalletPresent", "expectedValue": true, "timeoutMs": 5000},
        {"stepOrder": 2, "stepType": "READ_SINGLE", "tagKey": "Barcode", "outputVariable": "palletBarcode", "timeoutMs": 2000},
        {"stepOrder": 3, "stepType": "READ_SINGLE", "tagKey": "WeightKg", "outputVariable": "measuredWeightKg", "timeoutMs": 2000},
        {"stepOrder": 4, "stepType": "WRITE_SINGLE", "tagKey": "TargetLane", "writeValue": "#{targetLane}", "timeoutMs": 2000},
        {"stepOrder": 5, "stepType": "WRITE_SINGLE", "tagKey": "WcsAck", "writeValue": true, "timeoutMs": 2000},
        {"stepOrder": 6, "stepType": "AWAIT_CONFIRMATION", "tagKey": "PlcDone", "expectedValue": true, "timeoutMs": 5000},
        {"stepOrder": 7, "stepType": "RESET", "tagKey": "WcsAck", "writeValue": false, "timeoutMs": 2000}
    ]'::jsonb,
    'stationResult'
) ON CONFLICT (template_code) DO NOTHING;
