-- Schema: wes (Warehouse Execution System)
CREATE SCHEMA IF NOT EXISTS wes;

-- ============================================================================
-- 1. DYNAMIC CUSTOM ATTRIBUTE DEFINITION (Metadata Engine)
-- ============================================================================
-- Custom properties are strictly scoped to 3 distinct levels:
-- 1. 'ITEM'              -> Product specifications (Allergen, Storage Condition, Acclimatization)
-- 2. 'SKU'               -> Packaging container specs (Dimensions, Gross Weight, Seal Type)
-- 3. 'HANDLING_STRATEGY' -> Palletization & warehouse rules (Stackability, Slip Sheets, Wrap Tension)
CREATE TABLE IF NOT EXISTS wes.custom_attribute_definition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_entity VARCHAR(30) NOT NULL,          -- 'ITEM', 'SKU', 'HANDLING_STRATEGY'
    attribute_code VARCHAR(50) NOT NULL,         -- JSON key: e.g. 'allergen', 'acclimatization_hours', 'load_bearing'
    label VARCHAR(100) NOT NULL,                 -- UI display label: 'Allergen Declaration'
    description TEXT,
    data_type VARCHAR(30) NOT NULL,              -- 'STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT_ONE', 'MULTI_SELECT'
    unit_of_measure VARCHAR(20),                 -- Optional UoM: e.g. '°C', 'kg', 'mm', 'Hours'
    applies_to_category VARCHAR(50) NOT NULL DEFAULT 'ALL', -- e.g. 'ALL', 'RAW_MATERIAL', 'FINISHED_GOOD', 'FOOD'
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    default_value JSONB,
    min_value NUMERIC(15, 4),
    max_value NUMERIC(15, 4),
    validation_regex VARCHAR(255),
    allowed_options JSONB,                       -- e.g. ["DAIRY", "GLUTEN", "SOY", "NONE"]
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entity_attribute_code UNIQUE (target_entity, attribute_code),
    CONSTRAINT chk_target_entity CHECK (target_entity IN ('ITEM', 'SKU', 'HANDLING_STRATEGY'))
);

-- ============================================================================
-- 2. PALLET TYPE MASTER (Standard Carrier Bases)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wes.pallet_type_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,            -- e.g. 'EUR_WOOD', 'US_GMA', 'PLASTIC_CLEANROOM'
    name VARCHAR(100) NOT NULL,                  -- e.g. 'Euro Pallet EPAL 1'
    material VARCHAR(30) NOT NULL DEFAULT 'WOOD',-- 'WOOD', 'PLASTIC', 'METAL'
    tare_weight_kg NUMERIC(10, 3) NOT NULL,      -- Standard base weight (e.g. 25.0 kg)
    length_mm NUMERIC(10, 2) NOT NULL,           -- e.g. 1200.0 mm
    width_mm NUMERIC(10, 2) NOT NULL,            -- e.g. 800.0 mm
    height_mm NUMERIC(10, 2) NOT NULL,           -- e.g. 144.0 mm
    max_payload_kg NUMERIC(10, 3) NOT NULL,      -- Max carrying capacity (e.g. 1500.0 kg)
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. ITEM MASTER (Product & Material Catalog - LEVEL 1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wes.item_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code VARCHAR(60) NOT NULL UNIQUE,       -- e.g. 'MAT-MILK-POWDER', 'MAT-RESIN-EPOXY'
    name VARCHAR(255) NOT NULL,
    item_type VARCHAR(40) NOT NULL,              -- 'RAW_MATERIAL', 'FINISHED_GOOD', 'SPARE_PART'
    base_uom VARCHAR(20) NOT NULL,               -- 'LITER', 'KG', 'EA', 'METER'
    
    -- Mixing & Compatibility Rules
    allow_mixed_pallet BOOLEAN NOT NULL DEFAULT TRUE,
    mixed_pallet_group VARCHAR(50),              -- Compatibility group: e.g. 'FOOD_DAIRY', 'CHEMICALS'
    
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',-- 'ACTIVE', 'INACTIVE'
    
    -- Level 1 Custom Fields: Product, Chemistry & Storage specs
    -- e.g. {"storage_condition": "CHILLED_4C", "allergen": "DAIRY", "acclimatization_hours": 12}
    custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. SKU MASTER (Packaging Units - LEVEL 2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wes.sku_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_code VARCHAR(60) NOT NULL UNIQUE,        -- e.g. 'SKU-MILK-BAG25KG', 'SKU-RESIN-CAN5L', 'SKU-PUMP-LOOSE'
    item_id UUID NOT NULL REFERENCES wes.item_master(id) ON DELETE CASCADE,
    package_type VARCHAR(30) NOT NULL,           -- 'CAN', 'BAG', 'CARTON', 'DRUM', 'LOOSE'
    units_per_package NUMERIC(12, 4) NOT NULL DEFAULT 1.0, -- e.g. 25.0 (25kg Bag), 5.0 (5L Can), 1.0 (Loose)
    barcode VARCHAR(50),                         -- EAN-13, ITF-14, GS1 barcode
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Level 2 Custom Fields: Packaging container specs & dimensions
    -- e.g. {"sku_length_mm": 650, "sku_width_mm": 450, "sku_height_mm": 180, "gross_weight_kg": 25.2, "is_fragile": false}
    custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. PALLET HANDLING STRATEGY (Palletization Blueprint - LEVEL 3)
-- ============================================================================
-- The Master Recipe: Combines Item + SKU + Pallet Base into warehouse rules
CREATE TABLE IF NOT EXISTS wes.pallet_handling_strategy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_code VARCHAR(60) NOT NULL UNIQUE,   -- e.g. 'STRAT-MILK-BAG25KG-EUR'
    name VARCHAR(100) NOT NULL,                  -- 'Standard Euro Pallet: Milk Powder 25kg'
    
    -- The Master Combination
    item_id UUID NOT NULL REFERENCES wes.item_master(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES wes.sku_master(id) ON DELETE CASCADE,
    pallet_type_id UUID NOT NULL REFERENCES wes.pallet_type_master(id),
    
    -- Stacking Geometry (from Spreadsheet TI / HI)
    full_layer_qty INT NOT NULL,                 -- TI: Packages per layer (e.g. 5 bags)
    max_layers INT NOT NULL,                     -- HI: Max layers on pallet (e.g. 8 layers)
    standard_package_count INT NOT NULL,         -- 5 * 8 = 40 packages
    standard_total_quantity NUMERIC(12, 4) NOT NULL, -- 40 * 25 = 1000 KG
    
    -- Engineering Limits for ASRS Cranes & High-Bay Racks
    expected_total_weight_kg NUMERIC(10, 2),     -- e.g. 1025.0 kg (goods + pallet tare)
    expected_height_mm NUMERIC(10, 2),           -- e.g. 1584.0 mm
    
    is_default BOOLEAN NOT NULL DEFAULT TRUE,    -- Default strategy used when receiving/packing this SKU
    
    -- Level 3 Custom Fields: Warehouse Handling, Conveyor & Stacking Rules
    -- e.g. {"load_bearing": "DOUBLE_STACKABLE", "slip_sheet_required": true, "stretch_wrap_tension": "85%"}
    custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. PALLET (Physical LPN Instance - Generated from Handling Strategy)
-- ============================================================================
-- Clean and high-performance! Inherits rules from pallet_handling_strategy.
CREATE TABLE IF NOT EXISTS wes.pallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pallet_lpn VARCHAR(60) NOT NULL UNIQUE,        -- Barcode / SSCC: e.g. 'PLT-2026-000491'
    
    -- Links directly to the Handling Strategy blueprint!
    pallet_handling_strategy_id UUID REFERENCES wes.pallet_handling_strategy(id),
    pallet_type_id UUID NOT NULL REFERENCES wes.pallet_type_master(id),
    
    -- Real-time Operational State
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'LOADED', 'IN_ASRS', 'STAGED', 'SHIPPED'
    current_location VARCHAR(100),                 -- 'RACK-A-01-04', 'CONVEYOR-01'
    qa_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED', -- 'APPROVED', 'HOLD', 'QUARANTINE'
    is_mixed_pallet BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Verified Sensor Readings (Conveyor scales & contour scanners)
    actual_weight_kg NUMERIC(10, 2),
    actual_height_mm NUMERIC(10, 2),
    
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. PALLET ITEM (Inventory Stacked on the Pallet)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wes.pallet_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pallet_id UUID NOT NULL REFERENCES wes.pallet(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES wes.sku_master(id),
    
    package_count INT NOT NULL DEFAULT 1,          -- e.g. 40 Bags, 80 Cans, 1 Loose unit
    total_quantity NUMERIC(12, 4) NOT NULL,        -- e.g. 1000.0 KG, 400.0 L, 1.0 EA
    
    lot_number VARCHAR(60),                        -- Batch/Lot traceability
    serial_number VARCHAR(60),                     -- Serial number (for equipment)
    expiry_date DATE,                              -- Expiry for FIFO/FEFO picking
    
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
