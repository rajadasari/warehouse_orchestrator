-- ============================================================================
-- V12: Create wes.resource_template and wes.resource_relationship tables
--      Refactor wes.resource with template inheritance and categories
-- ============================================================================

-- 1. Create wes.resource_template
CREATE TABLE IF NOT EXISTS wes.resource_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(60) NOT NULL UNIQUE,
    template_name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,                      -- 'HARDWARE', 'DEVICE', 'SOFTWARE'
    resource_type VARCHAR(50) NOT NULL,                 -- 'CONVEYOR', 'TURNTABLE', 'TRANSFER_PORT', 'LOADING_STATION', 'UNLOADING_STATION', 'WEIGH_SCALE', 'BARCODE_SCANNER', 'WMS_REST', 'SERVICE_GRPC'
    communication_protocol VARCHAR(30) NOT NULL,        -- 'PLC_S7', 'MODBUS_TCP', 'TCP_SOCKET', 'SERIAL', 'REST', 'GRPC'
    property_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    supported_commands JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_template_cat_type ON wes.resource_template(category, resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_template_code ON wes.resource_template(template_code);

-- 2. Alter wes.resource for template-driven inheritance
ALTER TABLE wes.resource 
ADD COLUMN IF NOT EXISTS template_code VARCHAR(60) REFERENCES wes.resource_template(template_code),
ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'SOFTWARE',
ADD COLUMN IF NOT EXISTS template_properties JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_resource_template_code_fk ON wes.resource(template_code);
CREATE INDEX IF NOT EXISTS idx_resource_category ON wes.resource(category);

-- 3. Create wes.resource_relationship
CREATE TABLE IF NOT EXISTS wes.resource_relationship (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_resource_id VARCHAR(100) NOT NULL REFERENCES wes.resource(resource_id) ON DELETE CASCADE,
    target_resource_id VARCHAR(100) NOT NULL REFERENCES wes.resource(resource_id) ON DELETE CASCADE,
    relation_category VARCHAR(30) NOT NULL,             -- 'MATERIAL_FLOW', 'INFORMATION_FLOW'
    relation_type VARCHAR(50) NOT NULL,                 -- 'TRANSFERS_TO', 'DATA_SOURCE_FOR', 'CONTROLS', 'ATTACHED_TO', 'SERVICED_BY'
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,      -- transitTime, interlockBits, mappingCode
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_resource_relationship UNIQUE (source_resource_id, target_resource_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_resource_rel_source ON wes.resource_relationship(source_resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_rel_target ON wes.resource_relationship(target_resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_rel_cat ON wes.resource_relationship(relation_category);

-- 4. Seed Foundational Archetype Templates

-- 4.1 Software: Standard WMS REST OAuth2 Template
INSERT INTO wes.resource_template (
    template_code, template_name, category, resource_type, communication_protocol,
    property_schema, default_properties, supported_commands
) VALUES (
    'WMS_REST_OAUTH2',
    'Standard WMS REST (OAuth2)',
    'SOFTWARE',
    'WMS_REST',
    'REST',
    '[
      {"key": "host", "label": "Host / IP", "type": "STRING", "required": true, "defaultValue": "127.0.0.1"},
      {"key": "port", "label": "HTTP Port", "type": "NUMBER", "required": true, "defaultValue": 8080},
      {"key": "protocol", "label": "Protocol", "type": "ENUM", "options": ["http", "https"], "defaultValue": "http"},
      {"key": "authMethod", "label": "Auth Method", "type": "STRING", "defaultValue": "OAUTH2_BEARER"},
      {"key": "tokenPath", "label": "Token Path", "type": "STRING", "defaultValue": "/api/v1/auth/token"},
      {"key": "timeoutMs", "label": "Timeout (ms)", "type": "NUMBER", "defaultValue": 5000}
    ]'::jsonb,
    '{"protocol": "http", "authMethod": "OAUTH2_BEARER", "timeoutMs": 5000, "tokenPath": "/api/v1/auth/token"}'::jsonb,
    '["DISPATCH_API", "TEST_CONNECTION", "REFRESH_TOKEN"]'::jsonb
) ON CONFLICT (template_code) DO NOTHING;

-- 4.2 Hardware: Standard Siemens S7 Conveyor Line
INSERT INTO wes.resource_template (
    template_code, template_name, category, resource_type, communication_protocol,
    property_schema, default_properties, supported_commands
) VALUES (
    'CONVEYOR_SIEMENS_S7',
    'Standard Siemens S7 Conveyor',
    'HARDWARE',
    'CONVEYOR',
    'PLC_S7',
    '[
      {"key": "plcIp", "label": "PLC IP Address", "type": "STRING", "required": true, "defaultValue": "192.168.1.10"},
      {"key": "rack", "label": "PLC Rack", "type": "NUMBER", "defaultValue": 0},
      {"key": "slot", "label": "PLC Slot", "type": "NUMBER", "defaultValue": 1},
      {"key": "dbNumber", "label": "Data Block (DB)", "type": "NUMBER", "required": true, "defaultValue": 10},
      {"key": "startOffset", "label": "Run Command Offset", "type": "STRING", "defaultValue": "DBX0.0"},
      {"key": "jamSensorOffset", "label": "Jam Sensor Offset", "type": "STRING", "defaultValue": "DBX2.0"},
      {"key": "speedMps", "label": "Rated Speed (m/s)", "type": "NUMBER", "defaultValue": 1.2, "unit": "m/s"},
      {"key": "isBidirectional", "label": "Bidirectional Motor", "type": "BOOLEAN", "defaultValue": false}
    ]'::jsonb,
    '{"rack": 0, "slot": 1, "dbNumber": 10, "speedMps": 1.2, "isBidirectional": false}'::jsonb,
    '["RUN", "STOP", "CLEAR_JAM", "READ_TELEMETRY"]'::jsonb
) ON CONFLICT (template_code) DO NOTHING;

-- 4.3 Hardware: Standard 90-Degree Turn Table
INSERT INTO wes.resource_template (
    template_code, template_name, category, resource_type, communication_protocol,
    property_schema, default_properties, supported_commands
) VALUES (
    'TURNTABLE_STANDARD_90',
    'Standard 90° Turntable (PLC S7)',
    'HARDWARE',
    'TURNTABLE',
    'PLC_S7',
    '[
      {"key": "plcIp", "label": "PLC IP Address", "type": "STRING", "required": true, "defaultValue": "192.168.1.10"},
      {"key": "dbNumber", "label": "Data Block (DB)", "type": "NUMBER", "required": true, "defaultValue": 15},
      {"key": "supportedAngles", "label": "Supported Angles", "type": "ARRAY", "defaultValue": [0, 90]},
      {"key": "rotationSpeedDps", "label": "Rotation Speed (deg/s)", "type": "NUMBER", "defaultValue": 30, "unit": "deg/s"},
      {"key": "interlockBit", "label": "Safety Interlock Bit", "type": "STRING", "defaultValue": "DBX4.0"}
    ]'::jsonb,
    '{"supportedAngles": [0, 90], "rotationSpeedDps": 30, "dbNumber": 15}'::jsonb,
    '["ROTATE", "HOME", "LOCK_PINS", "READ_POSITION"]'::jsonb
) ON CONFLICT (template_code) DO NOTHING;

-- 4.4 Hardware: Transfer Port / Collaboration Boundary (Conveyor to AMR)
INSERT INTO wes.resource_template (
    template_code, template_name, category, resource_type, communication_protocol,
    property_schema, default_properties, supported_commands
) VALUES (
    'TRANSFER_PORT_AMR',
    'Conveyor-to-AMR Collaboration Boundary',
    'HARDWARE',
    'TRANSFER_PORT',
    'PLC_S7',
    '[
      {"key": "feedingSubsystem", "label": "Feeding Subsystem", "type": "STRING", "defaultValue": "WCS_CONVEYOR"},
      {"key": "takeawaySubsystem", "label": "Takeaway Subsystem", "type": "STRING", "defaultValue": "FLEET_AMR"},
      {"key": "opticalSensorOffset", "label": "Pallet Arrival Sensor", "type": "STRING", "defaultValue": "DBX10.0"},
      {"key": "lockPinOffset", "label": "Mechanical Lock Pin Bit", "type": "STRING", "defaultValue": "DBX10.1"},
      {"key": "amrDockingNodeId", "label": "AMR Map Node ID", "type": "STRING", "required": true, "defaultValue": "NODE-401"},
      {"key": "bufferCapacity", "label": "Pallet Buffer Capacity", "type": "NUMBER", "defaultValue": 1}
    ]'::jsonb,
    '{"feedingSubsystem": "WCS_CONVEYOR", "takeawaySubsystem": "FLEET_AMR", "bufferCapacity": 1}'::jsonb,
    '["LOCK_INTERLOCK", "RELEASE_INTERLOCK", "SIGNAL_READY", "AWAIT_PICKUP"]'::jsonb
) ON CONFLICT (template_code) DO NOTHING;

-- 4.5 Device: Certified Weigh Scale (Mettler Toledo TCP)
INSERT INTO wes.resource_template (
    template_code, template_name, category, resource_type, communication_protocol,
    property_schema, default_properties, supported_commands
) VALUES (
    'SCALE_METTLER_TOLEDO',
    'Mettler Toledo Scale (TCP Socket)',
    'DEVICE',
    'WEIGH_SCALE',
    'TCP_SOCKET',
    '[
      {"key": "ip", "label": "Scale IP Address", "type": "STRING", "required": true, "defaultValue": "192.168.1.50"},
      {"key": "port", "label": "TCP Port", "type": "NUMBER", "required": true, "defaultValue": 4001},
      {"key": "maxWeightKg", "label": "Max Capacity (kg)", "type": "NUMBER", "defaultValue": 1500, "unit": "kg"},
      {"key": "divisionGrams", "label": "Division / Resolution (g)", "type": "NUMBER", "defaultValue": 100, "unit": "g"},
      {"key": "toleranceKg", "label": "Tolerance (+/- kg)", "type": "NUMBER", "defaultValue": 5, "unit": "kg"}
    ]'::jsonb,
    '{"port": 4001, "maxWeightKg": 1500, "divisionGrams": 100, "toleranceKg": 5}'::jsonb,
    '["GET_WEIGHT", "TARE", "ZERO", "STREAM_WEIGHT"]'::jsonb
) ON CONFLICT (template_code) DO NOTHING;

-- 4.6 Device: Industrial Barcode Scanner (Fixed-Mount Optical)
INSERT INTO wes.resource_template (
    template_code, template_name, category, resource_type, communication_protocol,
    property_schema, default_properties, supported_commands
) VALUES (
    'SCANNER_INDUSTRIAL_BARCODE',
    'Fixed Optical Barcode Scanner (TCP/IP)',
    'DEVICE',
    'BARCODE_SCANNER',
    'TCP_SOCKET',
    '[
      {"key": "ip", "label": "Scanner IP Address", "type": "STRING", "required": true, "defaultValue": "192.168.1.60"},
      {"key": "port", "label": "TCP Port", "type": "NUMBER", "required": true, "defaultValue": 2112},
      {"key": "triggerMode", "label": "Trigger Mode", "type": "ENUM", "options": ["CONTINUOUS", "COMMAND", "SENSOR_PHOTOEYE"], "defaultValue": "SENSOR_PHOTOEYE"},
      {"key": "scanPrefix", "label": "Barcode Prefix Filter", "type": "STRING", "defaultValue": "PLT-"},
      {"key": "timeoutMs", "label": "Read Timeout (ms)", "type": "NUMBER", "defaultValue": 3000}
    ]'::jsonb,
    '{"port": 2112, "triggerMode": "SENSOR_PHOTOEYE", "scanPrefix": "PLT-", "timeoutMs": 3000}'::jsonb,
    '["TRIGGER_SCAN", "READ_BARCODE", "REBOOT"]'::jsonb
) ON CONFLICT (template_code) DO NOTHING;

-- 5. Update existing Logiqs Ambient WMS resource with template link
UPDATE wes.resource 
SET template_code = 'WMS_REST_OAUTH2', 
    category = 'SOFTWARE'
WHERE resource_id = 'LOGIQS-AMBIENT-WMS' AND template_code IS NULL;
