-- ============================================================================
-- V16: Universal Integration Channels, 5-Tier Rule Engine, and Handshake Sessions
-- ============================================================================

-- 1. Integration Channel Definition Table
CREATE TABLE IF NOT EXISTS wes.integration_channel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_code VARCHAR(60) NOT NULL UNIQUE,
    channel_name VARCHAR(120) NOT NULL,
    direction VARCHAR(20) NOT NULL DEFAULT 'INGRESS', -- 'INGRESS', 'EGRESS', 'BIDIRECTIONAL'
    domain VARCHAR(40) NOT NULL DEFAULT 'INBOUND',    -- 'INBOUND', 'OUTBOUND', 'INTERNAL_TRANSFER', 'INVENTORY', 'EQUIPMENT'
    payload_format VARCHAR(20) NOT NULL DEFAULT 'AUTO', -- 'AUTO', 'XML', 'JSON'
    mapping_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    handshake_config JSONB NOT NULL DEFAULT '{"mode": "SYNC_IMMEDIATE", "timeoutSeconds": 60}'::jsonb,
    default_success_state VARCHAR(40) NOT NULL DEFAULT 'ACCEPTED',
    workflow_code VARCHAR(60) REFERENCES wes.workflow_definition(workflow_code),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_channel_code ON wes.integration_channel(channel_code);
CREATE INDEX IF NOT EXISTS idx_integration_channel_dir_dom ON wes.integration_channel(direction, domain);

-- 2. Integration Session Table (Audit Trail, Correlation Keys & State Lifecycle)
CREATE TABLE IF NOT EXISTS wes.integration_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_key VARCHAR(100) NOT NULL UNIQUE,
    channel_code VARCHAR(60) NOT NULL REFERENCES wes.integration_channel(channel_code),
    direction VARCHAR(20) NOT NULL DEFAULT 'INGRESS',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    raw_payload TEXT,
    canonical_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    handshake_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_session_corr ON wes.integration_session(correlation_key);
CREATE INDEX IF NOT EXISTS idx_integration_session_channel ON wes.integration_session(channel_code);
CREATE INDEX IF NOT EXISTS idx_integration_session_status ON wes.integration_session(status);

-- 3. Seed Foundational Inbound Pallet Channel with 5-Tier Rule Engine
INSERT INTO wes.integration_channel (
    channel_code, channel_name, direction, domain, payload_format,
    mapping_rules, validation_rules, handshake_config, default_success_state, workflow_code, is_active
) VALUES (
    'INBOUND_PALLET_CHANNEL',
    'Standard Inbound Pallet Ingestion (XML IDoc & JSON)',
    'INGRESS',
    'INBOUND',
    'AUTO',
    '[
      {"sourcePath": "//LENUM | $.palletLpn | $.huNumber | $.lpn", "targetField": "palletLpn", "required": true},
      {"sourcePath": "//MATNR | $.skuCode | $.materialNumber | $.sku", "targetField": "skuCode", "required": true},
      {"sourcePath": "//MENGE | $.quantity | $.qty", "targetField": "quantity", "dataType": "NUMBER", "defaultValue": 1.0},
      {"sourcePath": "//GEWEI | $.actualWeightKg | $.weightKg", "targetField": "actualWeightKg", "dataType": "NUMBER", "defaultValue": 500.0},
      {"sourcePath": "//NLPLA | $.destinationBin | $.targetBin", "targetField": "destinationBin", "defaultValue": "RACK-A-01-01"},
      {"sourcePath": "//VLPLA | $.sourceLocation | $.inboundDock", "targetField": "sourceLocation", "defaultValue": "INBOUND_DOCK"},
      {"sourcePath": "//LETYP | $.palletType | $.typeCode", "targetField": "palletType", "defaultValue": "EURO"},
      {"sourcePath": "//DOCNUM | $.idocNumber | $.documentNumber", "targetField": "idocNumber"},
      {"sourcePath": "//MESTYP | $.messageType", "targetField": "messageType", "defaultValue": "WMTORD"}
    ]'::jsonb,
    '[
      {
        "id": "R1_TYPE_MATCH",
        "name": "Verify Valid Logistics Message Type",
        "type": "KEY_VALUE_MATCH",
        "field": "messageType",
        "operator": "IN",
        "expectedValues": ["WMTORD", "DELVRY", "PALLET_INBOUND", "PALLET_RECEIVE", "ASN"],
        "critical": true,
        "onFailureState": "REJECTED_INVALID_MESSAGE_TYPE",
        "failureMessage": "Message type must be one of [WMTORD, DELVRY, PALLET_INBOUND, PALLET_RECEIVE, ASN]"
      },
      {
        "id": "R2_SKU_LOOKUP",
        "name": "Verify SKU Exists in Master Catalog",
        "type": "DATABASE_LOOKUP",
        "field": "skuCode",
        "lookupTarget": "SKU_EXISTS",
        "critical": true,
        "onFailureState": "QUARANTINE_UNKNOWN_SKU",
        "failureMessage": "SKU does not exist in master catalog ledger"
      },
      {
        "id": "R3_CONVEYOR_WEIGHT_BOUNDS",
        "name": "Conveyor Physical Weight Bounds (25kg - 1500kg)",
        "type": "NUMERIC_COMPARISON",
        "field": "actualWeightKg",
        "operator": "BETWEEN_INCLUSIVE",
        "min": 25.0,
        "max": 1500.0,
        "critical": true,
        "onFailureState": "REJECTED_WEIGHT_OUT_OF_BOUNDS",
        "failureMessage": "Pallet weight exceeds physical handling boundaries (25kg - 1500kg)"
      }
    ]'::jsonb,
    '{
      "mode": "ASYNC_CALLBACK",
      "timeoutSeconds": 60,
      "callbackHeaderKey": "X-Correlation-ID",
      "ackPayloadTemplate": "{\"status\":\"ACCEPTED\",\"correlationKey\":\"{{correlationKey}}\",\"channel\":\"{{channelCode}}\"}"
    }'::jsonb,
    'ACCEPTED_IN_TRANSIT',
    'WF_INBOUND_PALLET_V1',
    TRUE
) ON CONFLICT (channel_code) DO NOTHING;

-- 4. Seed Foundational Outbound Dispatch Channel
INSERT INTO wes.integration_channel (
    channel_code, channel_name, direction, domain, payload_format,
    mapping_rules, validation_rules, handshake_config, default_success_state, is_active
) VALUES (
    'OUTBOUND_DISPATCH_CHANNEL',
    'Standard Outbound Wave Dispatch (Sync Response)',
    'EGRESS',
    'OUTBOUND',
    'JSON',
    '[
      {"sourcePath": "$.orderNumber", "targetField": "orderNumber", "required": true},
      {"sourcePath": "$.targetDock", "targetField": "targetDock", "required": true},
      {"sourcePath": "$.carrierCode", "targetField": "carrierCode", "defaultValue": "STANDARD"}
    ]'::jsonb,
    '[
      {
        "id": "R1_ORDER_NOT_EMPTY",
        "name": "Mandatory Order Number",
        "type": "KEY_VALUE_MATCH",
        "field": "orderNumber",
        "operator": "IS_NOT_EMPTY",
        "critical": true,
        "onFailureState": "REJECTED_EMPTY_ORDER",
        "failureMessage": "Order number is mandatory"
      }
    ]'::jsonb,
    '{
      "mode": "SYNC_IMMEDIATE",
      "timeoutSeconds": 15
    }'::jsonb,
    'DISPATCH_ACCEPTED',
    TRUE
) ON CONFLICT (channel_code) DO NOTHING;
