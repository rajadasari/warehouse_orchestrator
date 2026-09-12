# Master Data & Pallet Management Database Specification (`warehouse_db.wes`)

**DOCUMENT ID**: DB-SPEC-WES-004 (3-Tier Scoped Custom Fields Architecture)  
**SCHEMA**: `wes`  
**DATABASE**: `warehouse_db` (PostgreSQL 16+)  
**CORE ARCHITECTURE**: Master Definition (Item & SKU) $\rightarrow$ Pallet Handling Strategy (Blueprint) $\rightarrow$ Physical Pallet LPN.  
**CUSTOM FIELD SCOPES**: Strictly partitioned into **Item**, **SKU**, and **Handling Strategy**.

---

## 1. Schema Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    CUSTOM_ATTRIBUTE_DEFINITION {
        uuid id PK
        varchar target_entity "ITEM | SKU | HANDLING_STRATEGY"
        varchar attribute_code UK
        varchar label
        varchar data_type
        varchar unit_of_measure
        jsonb allowed_options
    }

    PALLET_TYPE_MASTER {
        uuid id PK
        varchar code UK
        varchar name
        varchar material
        numeric tare_weight_kg
        numeric length_mm
        numeric width_mm
        numeric height_mm
        numeric max_payload_kg
    }

    ITEM_MASTER {
        uuid id PK
        varchar item_code UK
        varchar name
        varchar item_type
        varchar base_uom
        boolean allow_mixed_pallet
        varchar mixed_pallet_group
        varchar status
        jsonb custom_attributes "Level 1: Product & Chemistry"
    }

    SKU_MASTER {
        uuid id PK
        varchar sku_code UK
        uuid item_id FK
        varchar package_type
        numeric units_per_package
        varchar barcode
        boolean is_active
        jsonb custom_attributes "Level 2: Packaging Container"
    }

    PALLET_HANDLING_STRATEGY {
        uuid id PK
        varchar strategy_code UK
        varchar name
        uuid item_id FK
        uuid sku_id FK
        uuid pallet_type_id FK
        integer full_layer_qty
        integer max_layers
        integer standard_package_count
        numeric standard_total_quantity
        numeric expected_total_weight_kg
        numeric expected_height_mm
        boolean is_default
        jsonb custom_attributes "Level 3: Stacking & Warehouse Rules"
    }

    PALLET {
        uuid id PK
        varchar pallet_lpn UK
        uuid pallet_handling_strategy_id FK
        uuid pallet_type_id FK
        varchar status
        varchar current_location
        varchar qa_status
        boolean is_mixed_pallet
        numeric actual_weight_kg
        numeric actual_height_mm
        jsonb telemetry "Lean: RFID / IoT Beacons"
    }

    PALLET_ITEM {
        uuid id PK
        uuid pallet_id FK
        uuid sku_id FK
        integer package_count
        numeric total_quantity
        varchar lot_number
        varchar serial_number
        date expiry_date
    }

    ITEM_MASTER ||--o{ SKU_MASTER : "packaged_as"
    ITEM_MASTER ||--o{ PALLET_HANDLING_STRATEGY : "configured_in"
    SKU_MASTER ||--o{ PALLET_HANDLING_STRATEGY : "configured_in"
    PALLET_TYPE_MASTER ||--o{ PALLET_HANDLING_STRATEGY : "carrier_for"
    PALLET_HANDLING_STRATEGY ||--o{ PALLET : "governs_blueprint"
    PALLET_TYPE_MASTER ||--o{ PALLET : "physical_base"
    PALLET ||--|{ PALLET_ITEM : "contains"
    SKU_MASTER ||--o{ PALLET_ITEM : "stacked_as"
```

---

## 2. The 3 Custom Field Scopes

### Level 1: `ITEM` Scope
- **Domain**: Product properties, chemistry, biology, shelf life, regulations.
- **Examples**: `allergen`, `storage_condition`, `acclimatization_hours`, `flash_point_c`, `viscosity`.
- **Target Audience**: R&D, Product Master Data Team, Quality Assurance.

### Level 2: `SKU` Scope
- **Domain**: Packaging format, container dimensions, tare weight, retail barcodes.
- **Examples**: `sku_length_mm`, `sku_width_mm`, `sku_height_mm`, `gross_weight_kg`, `is_fragile`, `cap_seal_type`.
- **Target Audience**: Packaging Engineering Team.

### Level 3: `HANDLING_STRATEGY` Scope
- **Domain**: Warehouse floor rules, automated crane kinematics, conveyor routing, stacking limits.
- **Examples**: `load_bearing` (`DOUBLE_STACKABLE`, `NON_STACKABLE`), `slip_sheet_required`, `stretch_wrap_tension`, `overhang_allowed_mm`.
- **Target Audience**: Warehouse Operations & Automation Engineering Team.

---

## 3. Performance Protection for Lakhs of Pallets
Because custom fields live exclusively in the **Master Configuration tables** (`item_master`, `sku_master`, `pallet_handling_strategy` $\approx$ a few thousand rows), the physical inventory table **`pallet`** ($\approx$ 500,000+ rows) remains **ultra-compact and lightning fast**:
- Zero duplicate JSON keys stored across 500,000 rows.
- Standard PostgreSQL B-Tree indexes on `(status, qa_status, current_location)`.
- Instant lookups for automated cranes and AGV fleets.

---

## 4. Migration File Location
`services/wes-service/src/main/resources/db/migration/V1__create_master_data_and_pallet_tables.sql`
