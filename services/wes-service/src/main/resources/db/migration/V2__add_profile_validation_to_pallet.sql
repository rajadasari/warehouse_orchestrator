-- ============================================================================
-- Flyway Migration V2: Add profile_validation boolean to wes.pallet
-- ============================================================================

ALTER TABLE wes.pallet 
ADD COLUMN IF NOT EXISTS profile_validation BOOLEAN NOT NULL DEFAULT TRUE;
