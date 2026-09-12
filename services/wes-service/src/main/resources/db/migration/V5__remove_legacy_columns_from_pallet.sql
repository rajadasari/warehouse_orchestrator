-- ============================================================================
-- Flyway Migration V5: Remove legacy columns from wes.pallet
-- (qa_status, actual_height_mm, profile_validation, pallet_stack_count)
-- ============================================================================

ALTER TABLE wes.pallet 
    DROP COLUMN IF EXISTS qa_status;

ALTER TABLE wes.pallet 
    DROP COLUMN IF EXISTS actual_height_mm;

ALTER TABLE wes.pallet 
    DROP COLUMN IF EXISTS profile_validation;

ALTER TABLE wes.pallet 
    DROP COLUMN IF EXISTS pallet_stack_count;
