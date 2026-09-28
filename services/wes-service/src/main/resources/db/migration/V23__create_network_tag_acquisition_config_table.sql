-- ============================================================================
-- V23: Normalized Acquisition Configuration Table for OPC-UA & Industrial Tags
-- Decouples tag address space identity from operational acquisition policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS wo.network_tag_acquisition_config (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id                  UUID NOT NULL REFERENCES wo.network_device_tag(id) ON DELETE CASCADE,
    acquisition_method      VARCHAR(40)      NOT NULL DEFAULT 'SUBSCRIPTION',
    sampling_interval_ms    INTEGER          NOT NULL DEFAULT 250,
    publishing_interval_ms  INTEGER          NOT NULL DEFAULT 500,
    deadband_value          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_logging_enabled      BOOLEAN          NOT NULL DEFAULT FALSE,
    is_active               BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tag_acquisition_config UNIQUE (tag_id),
    CONSTRAINT chk_acquisition_method CHECK (
        acquisition_method IN ('SUBSCRIPTION', 'POLLED_READ', 'HISTORICAL_ACCESS', 'PUBSUB_BROKER')
    )
);

CREATE INDEX IF NOT EXISTS idx_acq_cfg_tag_id ON wo.network_tag_acquisition_config(tag_id);
CREATE INDEX IF NOT EXISTS idx_acq_cfg_method ON wo.network_tag_acquisition_config(acquisition_method);
CREATE INDEX IF NOT EXISTS idx_acq_cfg_logging ON wo.network_tag_acquisition_config(is_logging_enabled) WHERE is_logging_enabled = TRUE;

-- Seed default SUBSCRIPTION configuration for any existing monitored tags
INSERT INTO wo.network_tag_acquisition_config (tag_id, acquisition_method, is_logging_enabled)
SELECT id, 'SUBSCRIPTION', false
FROM wo.network_device_tag
ON CONFLICT (tag_id) DO NOTHING;
