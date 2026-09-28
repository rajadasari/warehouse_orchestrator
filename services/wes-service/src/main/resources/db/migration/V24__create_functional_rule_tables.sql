-- ============================================================================
-- V24: Create Functional Support Rule Tables for OPC-UA & Industrial Automation
-- Stores configurable condition rules (1:1, 1:N, N:N, N:1) with math/string operators
-- ============================================================================

CREATE TABLE IF NOT EXISTS wo.functional_rule (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id              UUID NOT NULL REFERENCES wo.network_device_channel(id) ON DELETE CASCADE,
    rule_name               VARCHAR(120) NOT NULL,
    topology                VARCHAR(40)  NOT NULL DEFAULT 'SINGLE_READ_SINGLE_WRITE',
    is_reactive             BOOLEAN      NOT NULL DEFAULT FALSE,
    is_enabled              BOOLEAN      NOT NULL DEFAULT TRUE,
    description             VARCHAR(500),
    last_executed_at        TIMESTAMPTZ,
    last_execution_status   VARCHAR(30),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rule_topology CHECK (
        topology IN (
            'SINGLE_READ_SINGLE_WRITE',
            'SINGLE_READ_MULTI_WRITE',
            'MULTI_READ_MULTI_WRITE',
            'MULTI_READ_SINGLE_WRITE'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_func_rule_channel_id ON wo.functional_rule(channel_id);
CREATE INDEX IF NOT EXISTS idx_func_rule_reactive ON wo.functional_rule(is_reactive) WHERE is_reactive = TRUE;

CREATE TABLE IF NOT EXISTS wo.functional_rule_condition (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id                 UUID NOT NULL REFERENCES wo.functional_rule(id) ON DELETE CASCADE,
    condition_order         INTEGER      NOT NULL DEFAULT 0,
    source_node_id          VARCHAR(300) NOT NULL,
    operator                VARCHAR(30)  NOT NULL,
    threshold_value         VARCHAR(500) NOT NULL,
    threshold_data_type     VARCHAR(20)  NOT NULL DEFAULT 'STRING',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_func_rule_cond_rule_id ON wo.functional_rule_condition(rule_id);
CREATE INDEX IF NOT EXISTS idx_func_rule_cond_node_id ON wo.functional_rule_condition(source_node_id);

CREATE TABLE IF NOT EXISTS wo.functional_rule_action (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id                 UUID NOT NULL REFERENCES wo.functional_rule(id) ON DELETE CASCADE,
    action_order            INTEGER      NOT NULL DEFAULT 0,
    target_node_id          VARCHAR(300) NOT NULL,
    write_value             VARCHAR(500) NOT NULL,
    write_data_type         VARCHAR(20)  NOT NULL DEFAULT 'STRING',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_func_rule_act_rule_id ON wo.functional_rule_action(rule_id);
