-- ============================================================================
-- Flyway Migration V3: Add load_type, material relation, and pallet stack support
-- ============================================================================

-- 1. Add load_type, direct item_id, and pallet_stack_count to wes.pallet
ALTER TABLE wes.pallet 
ADD COLUMN IF NOT EXISTS load_type VARCHAR(30) NOT NULL DEFAULT 'MATERIAL_WITH_SKU';

ALTER TABLE wes.pallet 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES wes.item_master(id);

ALTER TABLE wes.pallet 
ADD COLUMN IF NOT EXISTS pallet_stack_count INT DEFAULT 0;

-- 2. Add direct item_id to wes.pallet_item and make sku_id nullable for direct material loads
ALTER TABLE wes.pallet_item 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES wes.item_master(id);

ALTER TABLE wes.pallet_item 
ALTER COLUMN sku_id DROP NOT NULL;
