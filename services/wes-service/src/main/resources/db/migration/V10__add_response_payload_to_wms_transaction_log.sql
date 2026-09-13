-- ============================================================================
-- V10: Add response_payload column to wes.wms_transaction_log table
-- ============================================================================
ALTER TABLE wes.wms_transaction_log
    ADD COLUMN IF NOT EXISTS response_payload JSONB DEFAULT '{}'::jsonb;
