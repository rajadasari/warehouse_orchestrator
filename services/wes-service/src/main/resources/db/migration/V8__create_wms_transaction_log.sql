-- ============================================================================
-- V8: Create wms_transaction_log table for auditing WMS transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS wes.wms_transaction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(40) NOT NULL,
    pallet_lpn VARCHAR(60),
    order_reference VARCHAR(80),
    wms_reference_id VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    details VARCHAR(500),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_tx_log_time 
    ON wes.wms_transaction_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wms_tx_log_lpn 
    ON wes.wms_transaction_log (pallet_lpn);
