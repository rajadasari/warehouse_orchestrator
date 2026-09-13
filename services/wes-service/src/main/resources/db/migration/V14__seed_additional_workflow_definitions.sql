-- ============================================================================
-- V14: Seed Additional Workflow Definitions (Manual Trigger & Outbound Staging)
-- ============================================================================

-- 1. Manual Operator Dispatch & QA Flow
INSERT INTO wes.workflow_definition (
    workflow_code, name, description, category, version, canvas_graph, is_active
) VALUES (
    'WF_MANUAL_DISPATCH_V1',
    'Manual Operator Pallet Dispatch & QA Flow',
    'Interactive workflow initiated via Manual Click Trigger by shop-floor operator with gross weight arithmetic validation and crane routing.',
    'INVENTORY',
    1,
    '{
      "nodes": [
        {
          "id": "node-manual-start",
          "type": "TRIGGER",
          "label": "Manual Click Trigger",
          "category": "TRIGGER",
          "position": { "x": 80, "y": 220 },
          "config": {
            "triggerType": "MANUAL_CLICK",
            "sourceChannel": "MANUAL_CLICK",
            "palletLpn": "PLT-MANUAL-1001",
            "sku": "SKU-AMBIENT-01",
            "quantity": 12,
            "notes": "Operator initiated dispatch"
          }
        },
        {
          "id": "node-calc-weight",
          "type": "MATH_OPERATION",
          "label": "Calc Gross Weight",
          "category": "MATH",
          "position": { "x": 380, "y": 220 },
          "config": {
            "operation": "ADD",
            "operandA": "25.0",
            "operandB": "quantity",
            "outputVariable": "calculatedGrossKg"
          }
        },
        {
          "id": "node-decision-weight",
          "type": "DECISION",
          "label": "Weight Check < 1500kg",
          "category": "LOGIC",
          "position": { "x": 680, "y": 220 },
          "config": {
            "conditionExpression": "context.calculatedGrossKg < 1500",
            "trueBranchLabel": "Safe Weight",
            "falseBranchLabel": "Overweight Divert"
          }
        },
        {
          "id": "node-state-ready",
          "type": "STATE_MUTATION",
          "label": "Mark READY_FOR_CRANE",
          "category": "STATE",
          "position": { "x": 980, "y": 220 },
          "config": {
            "targetEntity": "PALLET",
            "status": "AVAILABLE",
            "location": "CRANE-INFEED-01"
          }
        },
        {
          "id": "node-finish-dispatch",
          "type": "TERMINATOR",
          "label": "Dispatch Complete",
          "category": "TERMINATOR",
          "position": { "x": 1280, "y": 220 },
          "config": {
            "completionStatus": "COMPLETED",
            "notifyOperator": true
          }
        }
      ],
      "edges": [
        { "id": "e-m1", "source": "node-manual-start", "target": "node-calc-weight", "label": "Start" },
        { "id": "e-m2", "source": "node-calc-weight", "target": "node-decision-weight", "label": "Calculated" },
        { "id": "e-m3", "source": "node-decision-weight", "target": "node-state-ready", "label": "Approved" },
        { "id": "e-m4", "source": "node-state-ready", "target": "node-finish-dispatch", "label": "Next" }
      ]
    }'::jsonb,
    TRUE
) ON CONFLICT (workflow_code) DO NOTHING;

-- 2. Outbound Wave Pick & Staging Flow
INSERT INTO wes.workflow_definition (
    workflow_code, name, description, category, version, canvas_graph, is_active
) VALUES (
    'WF_OUTBOUND_STAGE_V1',
    'Outbound Wave Pick & Staging Orchestration',
    'Multi-step outbound picking: dimension tolerances, WMS pre-allocation, buffer staging and final shipping container sealing.',
    'OUTBOUND',
    1,
    '{
      "nodes": [
        {
          "id": "node-out-trigger",
          "type": "TRIGGER",
          "label": "Outbound Order Wave Release",
          "category": "TRIGGER",
          "position": { "x": 80, "y": 220 },
          "config": {
            "triggerEvent": "ORDER_WAVE_RELEASED",
            "sourceChannel": "HMI_OPERATOR_FORM",
            "requireLpn": true
          }
        },
        {
          "id": "node-out-validate",
          "type": "VALIDATION",
          "label": "Check Bay Clearance",
          "category": "LOGIC",
          "position": { "x": 380, "y": 220 },
          "config": {
            "validationType": "PROFILE_TOLERANCE",
            "rejectOnMissingSku": true
          }
        },
        {
          "id": "node-out-api",
          "type": "API_MAPPER",
          "label": "WMS Stage Pre-Announce",
          "category": "INTEGRATION",
          "position": { "x": 680, "y": 220 },
          "config": {
            "mappingCode": "WMS_PRE_ANNOUNCE",
            "resourceId": "LOGIQS-AMBIENT-WMS",
            "operationType": "PRE_ANNOUNCE"
          }
        },
        {
          "id": "node-out-state",
          "type": "STATE_MUTATION",
          "label": "Set Staged Location",
          "category": "STATE",
          "position": { "x": 980, "y": 220 },
          "config": {
            "targetEntity": "PALLET",
            "status": "ALLOCATED",
            "location": "STAGING-LANE-03"
          }
        },
        {
          "id": "node-out-end",
          "type": "TERMINATOR",
          "label": "Staged For Shipping",
          "category": "TERMINATOR",
          "position": { "x": 1280, "y": 220 },
          "config": {
            "completionStatus": "COMPLETED",
            "notifyOperator": true
          }
        }
      ],
      "edges": [
        { "id": "e-o1", "source": "node-out-trigger", "target": "node-out-validate", "label": "Release" },
        { "id": "e-o2", "source": "node-out-validate", "target": "node-out-api", "label": "Cleared" },
        { "id": "e-o3", "source": "node-out-api", "target": "node-out-state", "label": "Announced" },
        { "id": "e-o4", "source": "node-out-state", "target": "node-out-end", "label": "Staged" }
      ]
    }'::jsonb,
    TRUE
) ON CONFLICT (workflow_code) DO NOTHING;
