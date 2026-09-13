-- ============================================================================
-- V13: Create Generic Workflow Orchestration Tables and Seed Foundational Flow
-- ============================================================================

-- 1. Workflow Definition Table
CREATE TABLE IF NOT EXISTS wes.workflow_definition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    category VARCHAR(40) NOT NULL DEFAULT 'INBOUND', -- 'INBOUND', 'OUTBOUND', 'INVENTORY', 'CROSS_DOCK', 'GENERAL'
    version INT NOT NULL DEFAULT 1,
    canvas_graph JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_def_code ON wes.workflow_definition(workflow_code);
CREATE INDEX IF NOT EXISTS idx_workflow_def_cat ON wes.workflow_definition(category);

-- 2. Workflow Instance (Active State Machine Executions)
CREATE TABLE IF NOT EXISTS wes.workflow_instance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_code VARCHAR(60) NOT NULL REFERENCES wes.workflow_definition(workflow_code),
    entity_reference VARCHAR(100),               -- e.g. pallet_lpn or order_number
    status VARCHAR(30) NOT NULL DEFAULT 'RUNNING', -- 'RUNNING', 'WAITING_CALLBACK', 'WAITING_POLLING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED'
    current_node_id VARCHAR(60),
    correlation_key VARCHAR(120),
    context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_inst_code ON wes.workflow_instance(workflow_code);
CREATE INDEX IF NOT EXISTS idx_workflow_inst_entity ON wes.workflow_instance(entity_reference);
CREATE INDEX IF NOT EXISTS idx_workflow_inst_status ON wes.workflow_instance(status);
CREATE INDEX IF NOT EXISTS idx_workflow_inst_corr ON wes.workflow_instance(correlation_key);

-- 3. Workflow Execution Log (Step-by-Step Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS wes.workflow_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES wes.workflow_instance(id) ON DELETE CASCADE,
    step_sequence INT NOT NULL,
    node_id VARCHAR(60) NOT NULL,
    node_type VARCHAR(40) NOT NULL,
    node_name VARCHAR(120) NOT NULL,
    input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL,                  -- 'SUCCESS', 'FAILED', 'PAUSED_WAITING'
    duration_ms BIGINT NOT NULL DEFAULT 0,
    error_details TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_log_instance ON wes.workflow_execution_log(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_log_node ON wes.workflow_execution_log(node_id);

-- 4. Seed Foundational Generic Inbound Pallet Workflow Definition
INSERT INTO wes.workflow_definition (
    workflow_code, name, description, category, version, canvas_graph, is_active
) VALUES (
    'WF_INBOUND_PALLET_V1',
    'Standard Inbound Pallet Orchestration',
    'Full end-to-end inbound: validation, in-transit marking, Third-Party WMS API dispatch, async confirmation gate, and inventory reconciliation.',
    'INBOUND',
    1,
    '{
      "nodes": [
        {
          "id": "node-1",
          "type": "TRIGGER",
          "label": "Inbound Pallet Submitted",
          "category": "TRIGGER",
          "position": { "x": 80, "y": 200 },
          "config": {
            "triggerType": "INBOUND_SUBMISSION",
            "description": "Operator scans or submits pallet at receiving dock"
          }
        },
        {
          "id": "node-2",
          "type": "VALIDATION",
          "label": "Master Data 3-Tier Validation",
          "category": "ACTION",
          "position": { "x": 360, "y": 200 },
          "config": {
            "validationScope": "ALL_TIERS",
            "checkAllergens": true,
            "checkWeightCapacity": true
          }
        },
        {
          "id": "node-3",
          "type": "STATE_MUTATION",
          "label": "Set Pallet = IN_TRANSIT",
          "category": "ACTION",
          "position": { "x": 660, "y": 200 },
          "config": {
            "targetEntity": "PALLET",
            "targetStatus": "IN_TRANSIT",
            "updateLocation": true
          }
        },
        {
          "id": "node-4",
          "type": "API_MAPPER",
          "label": "Dispatch to 3rd-Party WMS",
          "category": "ACTION",
          "position": { "x": 960, "y": 200 },
          "config": {
            "mappingCode": "WMS_PRE_ANNOUNCE",
            "resourceId": "LOGIQS-AMBIENT-WMS",
            "timeoutMs": 5000
          }
        },
        {
          "id": "node-5",
          "type": "ASYNC_GATE",
          "label": "Await WMS Confirmation",
          "category": "GATEWAY",
          "position": { "x": 1260, "y": 200 },
          "config": {
            "gateMode": "WEBHOOK_OR_POLL",
            "callbackPath": "/api/v1/wes/workflows/callbacks",
            "pollingMappingCode": "WMS_POLL_STATUS",
            "pollingIntervalSeconds": 10,
            "timeoutSeconds": 300
          }
        },
        {
          "id": "node-6",
          "type": "STATE_MUTATION",
          "label": "Set Pallet = AVAILABLE",
          "category": "ACTION",
          "position": { "x": 1560, "y": 200 },
          "config": {
            "targetEntity": "PALLET",
            "targetStatus": "AVAILABLE",
            "markTaskCompleted": true
          }
        },
        {
          "id": "node-7",
          "type": "TERMINATOR",
          "label": "Inbound Complete",
          "category": "TERMINATOR",
          "position": { "x": 1840, "y": 200 },
          "config": {
            "outcome": "SUCCESS",
            "sendNotification": true
          }
        }
      ],
      "edges": [
        { "id": "e1-2", "source": "node-1", "target": "node-2", "label": "onScan" },
        { "id": "e2-3", "source": "node-2", "target": "node-3", "label": "Valid Pass" },
        { "id": "e3-4", "source": "node-3", "target": "node-4", "label": "Next" },
        { "id": "e4-5", "source": "node-4", "target": "node-5", "label": "Dispatched" },
        { "id": "e5-6", "source": "node-5", "target": "node-6", "label": "Confirmed" },
        { "id": "e6-7", "source": "node-6", "target": "node-7", "label": "Done" }
      ]
    }'::jsonb,
    TRUE
) ON CONFLICT (workflow_code) DO NOTHING;
