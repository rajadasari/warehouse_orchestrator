-- ============================================================================
-- V25: Add execution_mode (CONTINUOUS vs ONE_SHOT) to functional_rule
-- ============================================================================

ALTER TABLE wo.functional_rule 
ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(30) NOT NULL DEFAULT 'CONTINUOUS';

COMMENT ON COLUMN wo.functional_rule.execution_mode IS 'Trigger policy: CONTINUOUS (triggers on matching changes) or ONE_SHOT (triggers once and auto-deactivates)';
