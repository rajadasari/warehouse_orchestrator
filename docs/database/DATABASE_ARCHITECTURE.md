# Database Architecture & Multi-Schema Specification

**TARGET RDBMS**: PostgreSQL 16+ (On-Premises Bare-Metal, `localhost:5432`)  
**DATABASE NAME**: `warehouse_db`  
**PATTERN**: Single Database with Multiple Schemas (Domain-Driven Bounded Context Isolation)  
**MIGRATION ENGINE**: Flyway 10.x+ (`V{version}__{description}.sql`)  

---

## 1. Multi-Schema Topology & Bounded Contexts

To balance clean Domain-Driven Design (DDD) with ultra-simple bare-metal operations (single backup file, low connection overhead), all microservices connect to a single database `warehouse_db` segregated into dedicated schemas:

```
PostgreSQL 16 Cluster (localhost:5432/warehouse_db)
├── auth.*   ──> [auth-service] Identity, Operator Badges, IEC 62443 Roles & Permissions
├── wes.*    ──> [wes-service] Master Data (Materials, Pallets LPN, Storage Matrix), Resource Registry, Outbox
├── wms.*    ──> [wms-service] Physical Warehouse Hierarchy (Zones, Bins, Aisles), Inventory Allocations
├── wcs.*    ──> [wcs-service] Floor Conveyor Segments, Photo-Eye Tracking, Divert Points, Fault Log
├── asrs.*   ──> [asrs-wcs-service] Stacker Crane Kinematics, High-Bay Rack Grid Cells
└── fleet.*  ──> [fleet-service] AGVs / AMRs, VDA 5050 Orders, Nodes, Edges, Battery Telemetry
```

### Spring Boot Configuration Pattern
Each microservice sets its PostgreSQL default schema and Flyway schema in `application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/warehouse_db?currentSchema=wes
    username: ${DB_USERNAME:warehouse_app}
    password: ${DB_PASSWORD:warehouse_secure_pass_2026}
  jpa:
    properties:
      hibernate:
        default_schema: wes
        jdbc:
          time_zone: UTC
  flyway:
    enabled: true
    schemas: wes
    default-schema: wes
    table: flyway_schema_history
```

---

## 2. Universal Schema Standards

1. **Primary Keys**: UUIDv4 (`UUID DEFAULT gen_random_uuid()`) for distributed safety and collision-free entity generation across services.
2. **Optimistic Locking**: Every mutable operational table MUST declare `version INT NOT NULL DEFAULT 0` to power JPA `@Version`.
3. **Audit Timestamps**: Every table declares `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
4. **Digital Twin Extensibility**: Flexible attributes use `attributes JSONB NOT NULL DEFAULT '{}'::jsonb` indexed with GIN:
   ```sql
   CREATE INDEX idx_pallets_attributes_gin ON wes.pallets USING gin (attributes jsonb_path_ops);
   ```
5. **Zero Cross-Schema SQL Joins**: Microservices **never** write SQL joins across schemas. Cross-domain data exchange happens exclusively via **gRPC over HTTP/2** or asynchronous **PostgreSQL Transactional Outbox** events.

---

## 3. Schema Dictionaries

### 3.1. Schema: `auth` (Identity & IEC 62443 Access Control)

> [!TIP]
> Complete column data dictionary, constraints, indexes, and Mermaid ERD:
> **[docs/database/USER_MANAGEMENT_TABLE_SPECIFICATION.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/database/USER_MANAGEMENT_TABLE_SPECIFICATION.md)**.

| Table | Purpose | Key Columns |
| :--- | :--- | :--- |
| **`users`** | Operator & Admin Accounts | `user_id` (PK), `username`, `password_hash` (Argon2id), `operator_badge_id`, `badge_hash`, `pin_hash`, `sso_provider` (`LOCAL`, `AZURE_AD`), `status` (`ACTIVE`, `LOCKED`), `force_password_change`, `failed_login_attempts`, `locked_until`, `is_deleted`. |
| **`roles`** | Security Roles | `role_id` (PK), `role_code` (`ROLE_OPERATOR`, `ROLE_SUPERVISOR`, `ROLE_ADMIN`, `ROLE_MAINTENANCE`), `role_name`, `is_system_role`. |
| **`permissions`** | IEC 62443 Granular Tokens | `permission_id` (PK), `permission_code` (`PAGE:ASRS:VIEW`, `BTN:CONVEYOR:E_STOP_RESET`), `category`, `risk_tier` (`MONITORING`, `STANDARD`, `SAFETY_CRITICAL`), `requires_dual_approval`. |
| **`user_roles`** | User-to-Role Mapping | `user_id` (PK, FK), `role_id` (PK, FK), `assigned_at`, `assigned_by` (FK). |
| **`role_permissions`** | Role-to-Permission Mapping | `role_id` (PK, FK), `permission_id` (PK, FK), `assigned_at`, `assigned_by` (FK). |
| **`user_facility_assignments`** | Multi-Site & Shift Scoping | `assignment_id` (PK), `user_id` (FK), `facility_id`, `default_zone`, `shift_code`, `is_primary`. |
| **`refresh_tokens`** | Session Lifecycle & Revocation | `token_id` (PK), `user_id` (FK), `token_hash` (Unique), `terminal_ip`, `user_agent`, `expires_at`, `is_revoked`. |
| **`password_history`** | NIST SP 800-63B Rotation | `history_id` (PK), `user_id` (FK), `password_hash` (Argon2id), `created_at`. |
| **`dual_approval_audit`** | Four-Eyes Principle Audit | `approval_id` (PK), `action_name`, `target_resource`, `operator_user_id` (FK), `supervisor_user_id` (FK), `reason`, `approved_at`, `terminal_ip`. |
| **`security_audit_log`** | Forensic Auth Audit Trail | `log_id` (PK), `event_type`, `user_id` (FK), `username_attempted`, `terminal_ip`, `status`, `details` (JSONB), `created_at`. |

---

### 3.2. Schema: `wes` (Execution & Master Data Authority)

| Table | Purpose | Key Columns |
| :--- | :--- | :--- |
| **`materials`** | SKU Master Catalog | `material_id` (PK), `material_code` (Unique), `name`, `length_mm`, `width_mm`, `height_mm`, `gross_weight_g`, `storage_condition_id` (FK), `is_hazmat`, `is_fragile`, `attributes` (JSONB). |
| **`storage_conditions`** | Environmental Matrix | `condition_id` (PK), `condition_code`, `min_temperature_c`, `max_temperature_c`, `max_relative_humidity`, `segregation_group`, `incompatible_groups` (`TEXT[]`). |
| **`pallets`** | LPN Physical Digital Twin | `pallet_id` (PK), `lpn_code` (Unique), `pallet_type`, `tare_weight_g`, `max_weight_capacity_g`, `status` (`IN_STAGING`, `TRANSPORTING`, `STORED_ASRS`, `FAULT_HOLD`), `current_location_code`, `current_zone`, `destination_location_code`, `version`. |
| **`pallet_items`** | Inventory on Pallet | `id` (PK), `pallet_id` (FK), `material_id` (FK), `batch_number`, `quantity`, `uom`, `expiry_date`, `qc_status` (`RELEASED`, `QUARANTINED`). |
| **`registered_resources`**| Resource Manager Twin | `resource_id` (PK), `resource_type` (`CONVEYOR`, `ASRS_CRANE`, `AGV`, `STATION`), `operational_status` (`ONLINE`, `BUSY`, `FAULT`, `OFFLINE`), `ip_address`, `port`, `grpc_endpoint_url`, `capabilities` (JSONB), `last_heartbeat_at`. |
| **`transport_tasks`** | Pallet Movement Orders | `task_id` (PK), `pallet_id` (FK), `priority`, `source_location`, `destination_location`, `assigned_path_type` (`CONVEYOR_PATH_1`, `CONVEYOR_PATH_2`, `AGV_TRANSFER`), `task_state`, `version`. |
| **`wes_outbox`** | Transactional Outbox | `id` (PK), `aggregate_type`, `aggregate_id`, `event_type`, `payload` (JSONB), `status` (`PENDING`, `SENT`, `FAILED`), `retry_count`, `created_at`. |

---

### 3.3. Schema: `wms` (Physical Bins & Local Inventory)

| Table | Purpose | Key Columns |
| :--- | :--- | :--- |
| **`warehouse_zones`** | Storage Zones | `zone_id` (PK), `zone_code`, `temperature_condition_id`. |
| **`bins`** | Storage Cells on Racks | `bin_id` (PK), `bin_barcode` (Unique), `zone_id` (FK), `aisle`, `bay`, `level`, `position`, `coord_x_mm`, `coord_y_mm`, `coord_z_mm`, `max_weight_capacity_g`, `is_occupied`, `is_locked_for_putaway`, `current_pallet_lpn`, `version`. |
| **`bin_inventory`** | Physical Stock Records | `id` (PK), `bin_id` (FK), `material_code`, `batch_number`, `qty_on_hand`, `qty_allocated`. |
| **`wms_outbox`** | Transactional Outbox | `id` (PK), `aggregate_type`, `aggregate_id`, `event_type`, `payload` (JSONB), `status`. |

---

### 3.4. Schema: `wcs` (Conveyors & Sorters)

| Table | Purpose | Key Columns |
| :--- | :--- | :--- |
| **`conveyor_segments`** | Physical Line Segments | `segment_id` (PK), `plc_id`, `direction` (`FORWARD`, `REVERSIBLE`), `nominal_speed_mps`, `operational_state` (`RUNNING`, `IDLE`, `E_STOP`, `FAULT`). |
| **`divert_points`** | Automated Diverters | `divert_id` (PK), `segment_id` (FK), `default_direction`, `divert_direction`, `photo_eye_node_id` (OPC UA Node). |
| **`conveyor_tracking_register`** | In-Flight Pallets on Lines | `tracking_id` (PK), `pallet_lpn`, `current_segment_id`, `target_divert_id`, `entry_timestamp`, `status` (`IN_MOTION`, `DIVERTING`, `CONFIRMED`, `RECIRCULATING`), `version`. |
| **`equipment_fault_log`** | PLC Alarm Events | `fault_id` (PK), `equipment_id`, `fault_code`, `severity`, `plc_timestamp`, `resolved_at`. |

---

### 3.5. Schema: `asrs` (High-Bay Stacker Cranes)

| Table | Purpose | Key Columns |
| :--- | :--- | :--- |
| **`asrs_cells`** | Rack Grid Cells | `cell_id` (PK), `rack_id`, `aisle_number`, `column_number`, `tier_level`, `depth_type` (`SINGLE_DEEP`, `DOUBLE_DEEP`), `is_occupied`, `occupied_lpn`, `cell_status`. |
| **`crane_missions`** | Kinematic Crane Tasks | `mission_id` (PK), `crane_id`, `mission_type` (`PUTAWAY_STORAGE`, `RETRIEVAL_DISPATCH`, `RELOCATE`), `pallet_lpn`, `source_aisle`, `source_col`, `source_tier`, `target_aisle`, `target_col`, `target_tier`, `mission_state` (`QUEUED`, `PICKING`, `TRAVELING`, `DEPOSITING`, `FINISHED`, `ERROR`), `version`. |

---

### 3.6. Schema: `fleet` (AGV / AMR Robots - VDA 5050)

| Table | Purpose | Key Columns |
| :--- | :--- | :--- |
| **`agv_vehicles`** | Robot Registry & Telemetry | `vehicle_id` (PK), `serial_number`, `manufacturer`, `battery_percentage`, `current_x_m`, `current_y_m`, `current_theta_rad`, `connection_state` (`ONLINE`, `OFFLINE`), `safety_state` (`CLEAR`, `OBSTACLE_STOP`, `E_STOP`), `last_telemetry_at`. |
| **`vda_orders`** | VDA 5050 Mission Graph | `order_id` (PK), `vehicle_id` (FK), `order_update_id`, `nodes` (JSONB array of waypoints), `edges` (JSONB trajectories), `order_status` (`ACTIVE`, `COMPLETED`, `FAILED`), `version`. |

---

## 4. Transactional Outbox Pattern Details

To ensure zero dual-write bugs between database operations and message broker notifications, services insert events into their local Outbox table inside the same ACID transaction:

```
┌────────────────────────────────────────┐
│ Spring @Transactional                  │
│                                        │
│ 1. UPDATE wes.pallets SET status=...   │
│ 2. INSERT INTO wes.wes_outbox (...)    │
│                                        │
└──────────────────┬─────────────────────┘
                   │ COMMIT (ACID)
                   ▼
┌────────────────────────────────────────┐
│ Polling Outbox Worker (@Scheduled)     │
│                                        │
│ 1. SELECT * FROM wes.wes_outbox        │
│    WHERE status='PENDING'              │
│ 2. Publish to Eclipse Mosquitto (MQTT) │
│ 3. UPDATE status='SENT'                │
└────────────────────────────────────────┘
```
