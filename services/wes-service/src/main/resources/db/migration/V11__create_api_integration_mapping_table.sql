-- ============================================================================
-- V11: Create wes.api_integration_mapping table for No-Code Dynamic API Mappers
-- ============================================================================

CREATE TABLE IF NOT EXISTS wes.api_integration_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapping_code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    operation_type VARCHAR(50) NOT NULL,              -- 'PRE_ANNOUNCE', 'CREATE_ORDER', 'RESERVE_ORDER', 'OUTBOUND_RELEASE', 'CUSTOM'
    target_resource_id VARCHAR(100) NOT NULL,          -- references wes.resource.resource_id (e.g. 'LOGIQS-AMBIENT-WMS')
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',  -- 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'
    endpoint_url VARCHAR(255) NOT NULL,               -- e.g. '/api/v1/wms/pallets/pre-announce'
    headers_template TEXT NOT NULL DEFAULT '{"Content-Type": "application/json"}',
    payload_template TEXT NOT NULL DEFAULT '{}',
    condition_rules TEXT NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_api_mapping_resource_op 
    ON wes.api_integration_mapping(target_resource_id, operation_type, is_active);

CREATE INDEX IF NOT EXISTS idx_api_mapping_code 
    ON wes.api_integration_mapping(mapping_code);

-- Seed initial default dynamic mapping for Logiqs Ambient Pre-Announce
INSERT INTO wes.api_integration_mapping (
    mapping_code,
    name,
    description,
    operation_type,
    target_resource_id,
    http_method,
    endpoint_url,
    headers_template,
    payload_template,
    condition_rules,
    is_active
) VALUES (
    'LOGIQS_AMBIENT_PRE_ANNOUNCE',
    'Logiqs Ambient WMS - Pallet Pre-Announce',
    'Standard pre-announcement payload to Logiqs Ambient WMS including carrier tare and pallet item details',
    'PRE_ANNOUNCE',
    'LOGIQS-AMBIENT-WMS',
    'POST',
    '/api/v1/wms/pallets/pre-announce',
    '{"Content-Type": "application/json", "X-Source-System": "WES-ORCHESTRATOR"}',
    '{
      "palletLpn": "{{pallet.palletLpn}}",
      "palletTypeCode": "{{pallet.palletTypeCode | \"EUR_WOOD\"}}",
      "itemCode": "{{pallet.itemCode}}",
      "skuCode": "{{pallet.skuCode}}",
      "quantity": {{pallet.quantity | 1000}},
      "uom": "{{pallet.uom | \"KG\"}}",
      "lotNumber": "{{pallet.lotNumber | \"\"}}",
      "expiryDate": "{{pallet.expiryDate | \"\"}}",
      "grossWeightKg": {{pallet.actualWeightKg | 1025.0}},
      "receivingLocation": "{{pallet.sourceLocation | \"RCV-DOCK-01\"}}",
      "receiptTimestamp": "{{fn.now}}",
      "systemClientId": "{{resource.customProperties.clientId}}"
    }',
    '[]',
    TRUE
) ON CONFLICT (mapping_code) DO NOTHING;
