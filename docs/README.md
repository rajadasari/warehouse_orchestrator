# Warehouse Orchestration Platform Documentation

This repository contains the architecture, database specifications, development standards, and operational strategies for the **Warehouse Orchestration Platform**.

---

## Documentation Index

### 1. System Design & Orchestration Strategies
* [SYSTEM_DESIGN.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/system-design/SYSTEM_DESIGN.md): High-level C4 architecture, ISA-95 / Purdue model, microservice boundaries, event topologies.
* [WES_CENTRIC_GRPC_MASTER_DATA_ARCHITECTURE.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/system-design/WES_CENTRIC_GRPC_MASTER_DATA_ARCHITECTURE.md): WES master data authority, digital twin specifications, bare-metal server deployment, and gRPC communication fabric.
* **[PALLET_JOURNEY_AND_TRAVEL_CONTROL_STRATEGY.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/system-design/PALLET_JOURNEY_AND_TRAVEL_CONTROL_STRATEGY.md)**: *(Living Strategy)* End-to-end multi-modal pallet travel controls, conveyor point-to-point transit, AMR zone-to-zone transfer, dynamic staging buffering, resource-driven restarts, gatekeeper checks, and action execution.

### 2. Architecture & Tech Stack
* [TECH_STACK.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/architecture/TECH_STACK.md): Technology stack selections, frameworks, drivers, and industrial communication protocols.

### 3. Database & Schemas
* [DATABASE_ARCHITECTURE.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/database/DATABASE_ARCHITECTURE.md): Multi-schema architecture (`auth`, `wes`, `wms`, `wcs`, `asrs`, `fleet`), Flyway migration standards, and outbox patterns.
* [MASTER_DATA_TABLE_SPECIFICATION.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/database/MASTER_DATA_TABLE_SPECIFICATION.md): Core master data entity schemas and relationships.
* [USER_MANAGEMENT_TABLE_SPECIFICATION.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/database/USER_MANAGEMENT_TABLE_SPECIFICATION.md): IEC 62443 user roles, operator badges, and access control.
* [MASTER_DATA_SAMPLE_DATA.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/database/MASTER_DATA_SAMPLE_DATA.md): Sample seed data for development and testing.

---

## Strategy Document Evolution & Updates

When updating the **Pallet Journey & Travel Control Strategy**:
1. Review physical hardware limits against `wes.pallet_handling_strategy` and `wes.pallet_type_master`.
2. Ensure state machine transitions adhere to optimistic concurrency control (`@Version`).
3. Maintain immutable audit recording in `wes.pallet_process_log` for all checkpoints and buffer events.
4. Align gRPC contracts in `common/common-grpc` with the specified message schemas.
