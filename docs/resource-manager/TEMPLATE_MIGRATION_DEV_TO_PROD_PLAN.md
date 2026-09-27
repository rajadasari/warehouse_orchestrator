# Implementation Plan: Dev-to-Prod Template Migration & Package Management

## 1. Overview & Objective
Enable developers and industrial engineers to author, test, and validate equipment/software templates in a **Development Server** and seamlessly promote them to **Staging/Production** environments without code redeployments or database lock-in.

Additionally, this cleanses hardcoded `@Component` archetype beans (such as `RestSoftwareEntityArchetype.java`), ensuring:
1. **Clean Slate Guarantee**: A new or cleared environment starts with 0 templates.
2. **Portability & Governance**: Templates are stored as portable JSON/YAML definition packages (versioned, signed, and importable/exportable).
3. **Multi-Environment Promotion (Dev → Staging → Prod)**: 1-click JSON export/import with pre-import dry-run validation, conflict detection, and shape dependency resolution.

---

## 2. Architecture & Design

```
 ┌────────────────────────────────────────────────────────┐
 │                   DEV ENVIRONMENT                      │
 │                                                        │
 │  Resource Studio / Template Editor                     │
 │     │                                                  │
 │     ▼                                                  │
 │  [Export Template Package]                             │
 └──────────────────────┬─────────────────────────────────┘
                        │
                        ▼ Portable Bundle (.json / .yaml)
                        │ {
                        │   "schemaVersion": "1.0",
                        │   "template": { "templateCode": "AMR_FLEET_V2", ... },
                        │   "shapes": [ "LIDAR_SAFETY", "BATTERY_MANAGEMENT" ],
                        │   "metadata": { "author": "dev-engineer", "exportedAt": "..." }
                        │ }
                        │
 ┌──────────────────────▼─────────────────────────────────┐
 │                   PROD ENVIRONMENT                     │
 │                                                        │
 │  [Import Template Package Modal]                       │
 │     │                                                  │
 │     ▼                                                  │
 │  Pre-Import Dry-Run Validator                          │
 │     ├─ Check Shape Dependencies (Auto-import or warn)  │
 │     ├─ Property Schema Conflict Diff                   │
 │     └─ Method Signature Invariant Check                │
 │     │                                                  │
 │     ▼                                                  │
 │  Apply / Overwrite / Version Up                        │
 │     │                                                  │
 │     ▼                                                  │
 │  Postgres DB (wes.resource_template & resource_shape)  │
 └────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Changes Required

### Phase 1: Pure Clean Slate (Remove Hardcoded Archetype Beans)
1. **Remove `RestSoftwareEntityArchetype.java`**:
   - Delete or decouple [`RestSoftwareEntityArchetype.java`](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/services/wes-service/src/main/java/com/company/warehouse/wes/business/resource/composer/archetype/RestSoftwareEntityArchetype.java) so it is no longer an auto-discovered `@Component`.
2. **Refactor [`ResourceManager.java`](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/services/wes-service/src/main/java/com/company/warehouse/wes/business/resource/ResourceManager.java)**:
   - In `getAllTemplates(category)`, remove the automatic loop injecting hardcoded in-memory archetype beans.
   - Return solely from `templateRepository.findAll()` / `templateRepository.findByCategoryIgnoreCase()`.
3. **Verify Pure Clean Slate**:
   - `GET /api/v1/wes/resource-templates` returns `[]` (0 templates) when DB is empty.

---

### Phase 2: Template Package Exporter & Importer (Backend Service & API)
1. **Package Domain Record (`TemplatePackageDto`)**:
   - `schemaVersion`: String (e.g., `"1.0.0"`)
   - `exportedAt`: Instant
   - `environment`: String (e.g., `"DEVELOPMENT"`)
   - `templates`: List of `ResourceTemplateDto`
   - `bundledShapes`: List of associated `ResourceShapeDto` (ThingShapes) used by the templates
   - `checksum`: SHA-256 for tampering detection
2. **Backend Endpoints (`ResourceTemplateController.java`)**:
   - `GET /api/v1/wes/resource-templates/{templateCode}/export`: Downloads a self-contained JSON package.
   - `GET /api/v1/wes/resource-templates/export-all`: Exports all templates and shapes as an environment blueprint package.
   - `POST /api/v1/wes/resource-templates/import/dry-run`: Analyzes an uploaded package against target DB; returns:
     - New templates to create
     - Existing templates that would be updated/overwritten
     - Missing shape dependencies
     - Validation warnings (e.g., breaking method signature changes)
   - `POST /api/v1/wes/resource-templates/import`: Executes the import transactionally.

---

### Phase 3: Starter Packs Repository (Optional In-App Gallery)
1. **Built-in Bundles Directory (`resources/starter-templates/`)**:
   - Store standard industry templates as raw JSON files:
     - `rest_software_starter.json` (Generic HTTP/REST Gateway)
     - `amr_fleet_starter.json` (Autonomous Mobile Robot Fleet)
     - `siemens_s7_plc_starter.json` (PLC S7 Industrial Controller)
     - `highbay_crane_asrs.json` (AS/RS Stacker Crane)
2. **Starter Catalog API**:
   - `GET /api/v1/wes/resource-templates/starter-packs`: Lists available pre-built industry packages with descriptions.
   - `POST /api/v1/wes/resource-templates/starter-packs/{packId}/install`: Installs the starter template with 1 click into PostgreSQL.

---

### Phase 4: Frontend UI (Export, Import & Starter Pack Modal)
1. **Export Button**:
   - In Template Table, each row gets an **Export (JSON)** action button.
   - Top action bar gets an **Export All Blueprint** button.
2. **Import Modal (`TemplateImportModal.tsx`)**:
   - Drag-and-drop JSON file uploader.
   - Pre-import validation screen showing diffs (New, Conflict, Overwrite confirmation).
   - "Apply Import" button with instant feedback.
3. **Starter Catalog Drawer**:
   - Browse starter templates (Cranes, PLCs, AMRs, REST APIs).
   - "Install to System" button that writes them directly to the DB.

---

## 4. Verification & Testing Plan
1. **Clean Slate Verification**: Verify `GET /api/v1/wes/resource-templates` returns `[]` when DB is empty.
2. **Dev Creation**: Create a template `AMR_TEST_01` in the UI with custom properties and methods.
3. **Export**: Export `AMR_TEST_01.json`.
4. **Purge**: Clear DB again to 0 rows.
5. **Import Dry-Run**: Upload `AMR_TEST_01.json`, verify diff shows `NEW: AMR_TEST_01`.
6. **Import Apply**: Confirm template is restored into PostgreSQL and visible in the UI.
