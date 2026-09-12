# Master Data & Pallet Management - Realistic Sample Data

**DOCUMENT ID**: DB-SAMPLE-WES-001  
**SCHEMA**: `wes`  
**PURPOSE**: Realistic, production-style sample data demonstrating all combinations and permutations across Materials, Items, SKUs, and Pallets in the Warehouse Orchestrator.

---

## 1. Scenario Overview

This sample dataset models a modern manufacturing and distribution warehouse handling 4 realistic product categories:

| Scenario | Code | Name | Packaging & Handling | Pallet Load Type |
| :--- | :--- | :--- | :--- | :--- |
| **Material in Cans** *(Raw Mat)* | `MAT-EPOXY-RESIN` | Epoxy Resin Industrial Grade | 5-Liter Steel Can (`SKU-RESIN-CAN5L`) | Homogeneous Pallet (80 Cans = 400 L) |
| **Material in Bags** *(Raw Mat)* | `MAT-POLY-GRANULES` | Polypropylene Polymer Pellets | 25-KG Heavy Woven Bag (`SKU-POLY-BAG25KG`) | Homogeneous Pallet (40 Bags = 1000 KG) |
| **Mixed Pallet** *(Permutation)* | `PLT-2026-0003` | Mixed Chemical Production Kit | 10 Cans Resin + 10 Bags Hardener | **Mixed/Rainbow Pallet** on single LPN |
| **Loose Item / No SKU** *(Piece Pick)* | `ITM-TURBINE-PUMP` | 3-Phase Industrial Centrifugal Pump | Handled directly by piece (`EA`), no carton box | Single heavy pump strapped to pallet |
| **Packaged Item** *(Finished Goods)*| `ITM-BARCODE-SCANNER` | Rugged Handheld Scanner X-900 | 12 units per Master Carton Box (`SKU-SCANNER-BOX12`) | Pallet of 30 Boxes (360 Scanners) |

---

## 2. Table-by-Table Sample Records

### 2.1 `wes.custom_attribute_definition` (Dynamic Fields Catalog)

Defines the dynamic attributes available for Items, SKUs, and Pallets:

```sql
INSERT INTO wes.custom_attribute_definition 
(id, target_entity, attribute_code, label, data_type, unit_of_measure, applies_to_category, is_required, allowed_options)
VALUES
-- Item Dynamic Attributes
('a0000001-0000-0000-0000-000000000001', 'ITEM', 'item_type', 'Item Classification', 'SELECT_ONE', NULL, 'ALL', true, '["RAW_MATERIAL", "FINISHED_GOOD", "SPARE_PART"]'),
('a0000001-0000-0000-0000-000000000002', 'ITEM', 'base_uom', 'Base Unit of Measure', 'SELECT_ONE', NULL, 'ALL', true, '["LITER", "KG", "EA", "METER"]'),
('a0000001-0000-0000-0000-000000000003', 'ITEM', 'flash_point_c', 'Flash Point', 'NUMBER', '°C', 'RAW_MATERIAL', false, NULL),
('a0000001-0000-0000-0000-000000000004', 'ITEM', 'is_lot_tracked', 'Lot Tracking Required', 'BOOLEAN', NULL, 'ALL', true, NULL),
('a0000001-0000-0000-0000-000000000005', 'ITEM', 'shelf_life_days', 'Shelf Life (Days)', 'NUMBER', 'Days', 'ALL', false, NULL),

-- SKU Dynamic Attributes
('a0000001-0000-0000-0000-000000000006', 'SKU', 'package_format', 'Package Format', 'SELECT_ONE', NULL, 'ALL', true, '["CAN", "BAG", "CARTON_BOX", "DRUM", "LOOSE"]'),
('a0000001-0000-0000-0000-000000000007', 'SKU', 'gtin_barcode', 'GTIN / EAN Barcode', 'STRING', NULL, 'ALL', false, NULL),
('a0000001-0000-0000-0000-000000000008', 'SKU', 'gross_weight_kg', 'Gross Weight', 'NUMBER', 'kg', 'ALL', false, NULL),
('a0000001-0000-0000-0000-000000000009', 'SKU', 'is_fragile', 'Fragile Packaging', 'BOOLEAN', NULL, 'ALL', false, NULL),

-- Pallet Dynamic Attributes
('a0000001-0000-0000-0000-000000000010', 'PALLET', 'qa_status', 'QA Release Status', 'SELECT_ONE', NULL, 'ALL', true, '["APPROVED", "QUARANTINED", "REJECTED"]'),
('a0000001-0000-0000-0000-000000000011', 'PALLET', 'rfid_tag_epc', 'RFID Tag EPC', 'STRING', NULL, 'ALL', false, NULL),
('a0000001-0000-0000-0000-000000000012', 'PALLET', 'ispm_15_heat_treated', 'ISPM-15 Heat Treated', 'BOOLEAN', NULL, 'ALL', false, NULL);
```

---

### 2.2 `wes.pallet_type_master` (Pallet Types)

Standard pallet bases with their specifications stored dynamically in `custom_attributes`:

```sql
INSERT INTO wes.pallet_type_master (id, code, name, custom_attributes)
VALUES
('b0000001-0000-0000-0000-000000000001', 'EUR_PALLET_1', 'Euro Pallet (EPAL 1)', '{
    "material": "WOOD",
    "length_mm": 1200,
    "width_mm": 800,
    "height_mm": 144,
    "tare_weight_kg": 25.0,
    "max_payload_kg": 1500.0
}'::jsonb),

('b0000001-0000-0000-0000-000000000002', 'US_INDUSTRIAL_48x40', 'US GMA Industrial Pallet', '{
    "material": "WOOD",
    "length_mm": 1219,
    "width_mm": 1016,
    "height_mm": 121,
    "tare_weight_kg": 22.0,
    "max_payload_kg": 1800.0
}'::jsonb),

('b0000001-0000-0000-0000-000000000003', 'PLASTIC_CLEANROOM', 'Hygienic Plastic Pallet', '{
    "material": "PLASTIC",
    "length_mm": 1200,
    "width_mm": 800,
    "height_mm": 160,
    "tare_weight_kg": 18.0,
    "max_payload_kg": 1250.0,
    "washable": true
}'::jsonb);
```

---

### 2.3 `wes.item_master` (Lean Unified Catalog)

Materials and Finished Items with dynamic properties:

```sql
INSERT INTO wes.item_master (id, item_code, name, status, custom_attributes)
VALUES
-- 1. Material: Liquid Epoxy Resin
('c0000001-0000-0000-0000-000000000001', 'MAT-EPOXY-RESIN', 'Liquid Epoxy Resin A-200', 'ACTIVE', '{
    "item_type": "RAW_MATERIAL",
    "base_uom": "LITER",
    "is_lot_tracked": true,
    "shelf_life_days": 365,
    "flash_point_c": 120.0,
    "temp_zone": "AMBIENT"
}'::jsonb),

-- 2. Material: Polymer Pellets in Bags
('c0000001-0000-0000-0000-000000000002', 'MAT-POLY-GRANULES', 'Polypropylene Granules Grade B', 'ACTIVE', '{
    "item_type": "RAW_MATERIAL",
    "base_uom": "KG",
    "is_lot_tracked": true,
    "shelf_life_days": 730,
    "temp_zone": "AMBIENT"
}'::jsonb),

-- 3. Item: Industrial Water Pump (Handled Loose / No SKU)
('c0000001-0000-0000-0000-000000000003', 'ITM-TURBINE-PUMP', '3-Phase Heavy Centrifugal Pump 15kW', 'ACTIVE', '{
    "item_type": "FINISHED_GOOD",
    "base_uom": "EA",
    "is_lot_tracked": false,
    "is_serial_tracked": true,
    "temp_zone": "AMBIENT"
}'::jsonb),

-- 4. Item: Handheld Barcode Scanner (Handled in 12-Pack Boxes)
('c0000001-0000-0000-0000-000000000004', 'ITM-BARCODE-SCANNER', 'Warehouse Handheld Scanner Terminal X-900', 'ACTIVE', '{
    "item_type": "FINISHED_GOOD",
    "base_uom": "EA",
    "is_lot_tracked": false,
    "is_serial_tracked": true,
    "temp_zone": "AMBIENT"
}'::jsonb);
```

---

### 2.4 `wes.sku_master` (Packaging Formats & Conversions)

Intermediate SKU packaging units:

```sql
INSERT INTO wes.sku_master (id, sku_code, item_id, conversion_factor, is_active, custom_attributes)
VALUES
-- SKU 1: 5-Liter Can of Epoxy Resin (1 Can = 5 Liters)
('d0000001-0000-0000-0000-000000000001', 'SKU-RESIN-CAN5L', 'c0000001-0000-0000-0000-000000000001', 5.0, true, '{
    "package_format": "CAN",
    "gtin_barcode": "0793573189001",
    "gross_weight_kg": 5.45,
    "dimensions_mm": [180, 180, 240],
    "is_fragile": false,
    "units_per_layer": 20,
    "layers_per_pallet": 4
}'::jsonb),

-- SKU 2: 25-KG Bag of Polymer Granules (1 Bag = 25 KG)
('d0000001-0000-0000-0000-000000000002', 'SKU-POLY-BAG25KG', 'c0000001-0000-0000-0000-000000000002', 25.0, true, '{
    "package_format": "BAG",
    "gtin_barcode": "0793573189002",
    "gross_weight_kg": 25.20,
    "dimensions_mm": [600, 400, 150],
    "is_fragile": false,
    "units_per_layer": 5,
    "layers_per_pallet": 8
}'::jsonb),

-- SKU 3: 12-Piece Master Carton of Barcode Scanners (1 Box = 12 Scanners)
('d0000001-0000-0000-0000-000000000003', 'SKU-SCANNER-BOX12', 'c0000001-0000-0000-0000-000000000004', 12.0, true, '{
    "package_format": "CARTON_BOX",
    "gtin_barcode": "10079357318903",
    "gross_weight_kg": 6.80,
    "dimensions_mm": [450, 300, 250],
    "is_fragile": true,
    "units_per_layer": 6,
    "layers_per_pallet": 5
}'::jsonb);

-- NOTE: ITM-TURBINE-PUMP has NO SKU record because it is handled loose by piece!
```

---

### 2.5 `wes.item_handling_policy` (Rules Engine)

Governs picking levels and pallet mixing compatibility:

```sql
INSERT INTO wes.item_handling_policy 
(id, item_id, allow_piece_handling, allow_sku_handling, allow_pallet_handling, allow_mixed_pallet, mixed_pallet_group)
VALUES
-- Resin Cans: Cannot be picked as loose liquid, picked by 5L Can or full pallet. Can mix with chemicals.
('e0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', false, true, true, true, 'CHEM_NON_HAZ'),

-- Polymer Bags: Cannot be picked as loose grains, picked by 25kg Bag or full pallet. Can mix with chemicals.
('e0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', false, true, true, true, 'CHEM_NON_HAZ'),

-- Turbine Pump: Handled loose directly by piece (no box). Cannot mix with other goods on pallet due to weight.
('e0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000003', true, false, true, false, 'HEAVY_MACHINERY'),

-- Barcode Scanners: Can be picked loose (1 scanner), as a carton (12 scanners), or full pallet.
('e0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000004', true, true, true, true, 'ELECTRONICS');
```

---

### 2.6 `wes.pallet` (Physical Pallet LPNs)

The physical pallets currently tracked inside the warehouse:

```sql
INSERT INTO wes.pallet (id, pallet_lpn, pallet_type_id, status, current_location_code, is_mixed_pallet, custom_attributes)
VALUES
-- Pallet 1: Homogeneous Pallet of Resin Cans
('f0000001-0000-0000-0000-000000000001', 'PLT-2026-0001', 'b0000001-0000-0000-0000-000000000001', 'IN_ASRS', 'RACK-A-04-12', false, '{
    "qa_status": "APPROVED",
    "rfid_tag_epc": "3039606243A29B4000000001",
    "ispm_15_heat_treated": true
}'::jsonb),

-- Pallet 2: Homogeneous Pallet of Polymer Bags
('f0000001-0000-0000-0000-000000000002', 'PLT-2026-0002', 'b0000001-0000-0000-0000-000000000001', 'IN_ASRS', 'RACK-B-02-08', false, '{
    "qa_status": "APPROVED",
    "rfid_tag_epc": "3039606243A29B4000000002",
    "ispm_15_heat_treated": true
}'::jsonb),

-- Pallet 3: MIXED PALLET (Resin Cans + Polymer Bags for Batch #409)
('f0000001-0000-0000-0000-000000000003', 'PLT-2026-0003', 'b0000001-0000-0000-0000-000000000003', 'STAGED', 'STAGE-DISPATCH-02', true, '{
    "qa_status": "APPROVED",
    "staging_purpose": "PRODUCTION_KITTING",
    "target_production_order": "PO-2026-8941"
}'::jsonb),

-- Pallet 4: Loose Heavy Item (Single Pump directly on pallet)
('f0000001-0000-0000-0000-000000000004', 'PLT-2026-0004', 'b0000001-0000-0000-0000-000000000002', 'IN_ASRS', 'RACK-HEAVY-01-01', false, '{
    "qa_status": "APPROVED",
    "strapped_secure": true
}'::jsonb),

-- Pallet 5: Master Cartons of Barcode Scanners
('f0000001-0000-0000-0000-000000000005', 'PLT-2026-0005', 'b0000001-0000-0000-0000-000000000001', 'IN_TRANSIT', 'CONVEYOR-CV04', false, '{
    "qa_status": "APPROVED",
    "rfid_tag_epc": "3039606243A29B4000000005"
}'::jsonb);
```

---

### 2.7 `wes.pallet_content` (Inventory on Pallet)

Shows how single-item, mixed-item, and loose items are stored on pallets:

```sql
INSERT INTO wes.pallet_content 
(id, pallet_id, item_id, quantity, package_count, lot_number, serial_number, expiry_date, custom_attributes)
VALUES
-- Pallet 1 Content: 80 Cans (400 Liters) of Epoxy Resin
('10000001-0000-0000-0000-000000000001', 
 'f0000001-0000-0000-0000-000000000001', 
 'c0000001-0000-0000-0000-000000000001', 
 400.0, 80, 'LOT-RESIN-2026A', NULL, '2027-09-01', '{"packaging_format": "CAN_5L"}'::jsonb),

-- Pallet 2 Content: 40 Bags (1000 KG) of Polymer Pellets
('10000001-0000-0000-0000-000000000002', 
 'f0000001-0000-0000-0000-000000000002', 
 'c0000001-0000-0000-0000-000000000002', 
 1000.0, 40, 'LOT-POLY-992B', NULL, '2028-01-15', '{"packaging_format": "BAG_25KG"}'::jsonb),

-- Pallet 3 (MIXED PALLET) Line 1: 10 Cans (50 Liters) of Epoxy Resin
('10000001-0000-0000-0000-000000000003', 
 'f0000001-0000-0000-0000-000000000003', 
 'c0000001-0000-0000-0000-000000000001', 
 50.0, 10, 'LOT-RESIN-2026A', NULL, '2027-09-01', '{"packaging_format": "CAN_5L"}'::jsonb),

-- Pallet 3 (MIXED PALLET) Line 2: 10 Bags (250 KG) of Polymer Pellets
('10000001-0000-0000-0000-000000000004', 
 'f0000001-0000-0000-0000-000000000003', 
 'c0000001-0000-0000-0000-000000000002', 
 250.0, 10, 'LOT-POLY-992B', NULL, '2028-01-15', '{"packaging_format": "BAG_25KG"}'::jsonb),

-- Pallet 4 Content: 1 Loose Turbine Pump (Serial Tracked, No SKU / No Box)
('10000001-0000-0000-0000-000000000005', 
 'f0000001-0000-0000-0000-000000000004', 
 'c0000001-0000-0000-0000-000000000003', 
 1.0, NULL, NULL, 'SN-PUMP-89421', NULL, '{"handling": "LOOSE_PIECE"}'::jsonb),

-- Pallet 5 Content: 30 Boxes (360 Units) of Barcode Scanners
('10000001-0000-0000-0000-000000000006', 
 'f0000001-0000-0000-0000-000000000005', 
 'c0000001-0000-0000-0000-000000000004', 
 360.0, 30, 'LOT-SCANNER-V1', NULL, NULL, '{"packaging_format": "CARTON_BOX_12"}'::jsonb);
```

---

## 3. Practical SQL Query Demonstration

### Query A: Inspecting a Pallet's Inventory (Including Mixed Pallets)
```sql
SELECT 
    p.pallet_lpn,
    p.status,
    p.current_location_code,
    p.is_mixed_pallet,
    i.item_code,
    i.name AS item_name,
    pc.package_count,
    pc.quantity AS quantity_base_uom,
    i.custom_attributes->>'base_uom' AS uom,
    pc.lot_number
FROM wes.pallet p
JOIN wes.pallet_content pc ON pc.pallet_id = p.id
JOIN wes.item_master i ON i.id = pc.item_id
WHERE p.pallet_lpn = 'PLT-2026-0003';
```

**Result**:
| pallet_lpn | status | current_location_code | is_mixed_pallet | item_code | item_name | package_count | quantity | uom | lot_number |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| `PLT-2026-0003` | `STAGED` | `STAGE-DISPATCH-02` | **t** | `MAT-EPOXY-RESIN` | Liquid Epoxy Resin A-200 | 10 | 50.0 | `LITER` | `LOT-RESIN-2026A` |
| `PLT-2026-0003` | `STAGED` | `STAGE-DISPATCH-02` | **t** | `MAT-POLY-GRANULES` | Polypropylene Granules | 10 | 250.0 | `KG` | `LOT-POLY-992B` |

---

### Query B: Checking If Two Items Are Allowed on the Same Mixed Pallet
```sql
SELECT 
    i.item_code,
    p.allow_mixed_pallet,
    p.mixed_pallet_group
FROM wes.item_handling_policy p
JOIN wes.item_master i ON i.id = p.item_id
WHERE i.item_code IN ('MAT-EPOXY-RESIN', 'MAT-POLY-GRANULES');
```

**Result**:
| item_code | allow_mixed_pallet | mixed_pallet_group |
| :--- | :---: | :--- |
| `MAT-EPOXY-RESIN` | **true** | `CHEM_NON_HAZ` |
| `MAT-POLY-GRANULES` | **true** | `CHEM_NON_HAZ` |

*(Since both items have `allow_mixed_pallet = true` and share the matching group `'CHEM_NON_HAZ'`, the WES permits building Pallet `PLT-2026-0003` without error).*
