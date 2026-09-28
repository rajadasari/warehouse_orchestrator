-- ============================================================================
-- V19: Create Workflow Node Template Table for Composed & System Workflow Nodes
-- ============================================================================

CREATE TABLE IF NOT EXISTS wes.workflow_node_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    node_type VARCHAR(40) NOT NULL,           -- 'RESOURCE_ACTION', 'API_MAPPER', 'VALIDATION', 'COMPOSED', etc.
    category VARCHAR(40) NOT NULL DEFAULT 'EQUIPMENT', -- 'EQUIPMENT', 'INTEGRATION', 'CONTROL_FLOW', 'CUSTOM'
    icon VARCHAR(60) NOT NULL DEFAULT 'Cpu',
    color VARCHAR(40) NOT NULL DEFAULT 'emerald',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    resource_code VARCHAR(60),                 -- optional target resource code if bound
    target_method VARCHAR(80),                 -- target method name if bound
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by VARCHAR(60) DEFAULT 'SYSTEM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_node_tpl_code ON wes.workflow_node_template(template_code);
CREATE INDEX IF NOT EXISTS idx_workflow_node_tpl_cat ON wes.workflow_node_template(category);
CREATE INDEX IF NOT EXISTS idx_workflow_node_tpl_type ON wes.workflow_node_template(node_type);

-- Seed Foundational Generic Equipment Resource Action Node Template
INSERT INTO wes.workflow_node_template (
    template_code, name, description, node_type, category, icon, color, is_system, configuration, input_schema, output_schema
) VALUES (
    'GENERIC_RESOURCE_ACTION',
    'Resource Action',
    'Invoke an inherited or custom method on any industrial resource or API gateway',
    'RESOURCE_ACTION',
    'EQUIPMENT',
    'Cpu',
    'emerald',
    TRUE,
    '{"resourceCode": "", "methodName": "", "parameters": {}, "timeoutMs": 5000}'::jsonb,
    '{"properties": {"resourceCode": {"type": "string"}, "methodName": {"type": "string"}, "parameters": {"type": "object"}}}'::jsonb,
    '{"properties": {"success": {"type": "boolean"}, "data": {"type": "object"}}}'::jsonb
) ON CONFLICT (template_code) DO NOTHING;
