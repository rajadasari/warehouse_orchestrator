# Warehouse Orchestrator — Cyber-Physical Digital Twin & WES/WCS Platform

An enterprise-grade, distributed cyber-physical warehouse execution and control system adhering to **ISA-95 Level 2/3** and **IEC 62443** industrial cybersecurity standards.

---

## 1. Subsystem Architecture

### Backend Microservices (`services/`)
Built with **Java 21 LTS**, **Spring Boot 3.3+**, and **PostgreSQL 17**:
- **`auth-service`** (HTTP 8085 / gRPC 9091): Identity provider, RBAC, Argon2id credentials, operator RFID badges, and Flyway schema migrations.
- **`gateway-service`** (HTTP 8080): Spring Cloud API Gateway routing external traffic with zero-trust token relay.
- **`wes-service`** (HTTP 8082 / gRPC 9082): Warehouse Execution System coordinating order fulfillment and pick/pack waves.
- **`wms-service`** (HTTP 8083 / gRPC 9093): Warehouse Management System maintaining inventory ledger and SKU locations.
- **`wcs-service`** (HTTP 8084 / gRPC 9094): Warehouse Control System orchestrating conveyor PLC divert routes.
- **`asrs-wcs-service`** (HTTP 8085 / gRPC 9095): Automated Storage and Retrieval System controlling high-bay stacker cranes.
- **`fleet-service`** (HTTP 8086 / gRPC 9096): AGV / AMR mobile robot fleet traffic coordination adhering to VDA 5050.

### Shared Common Libraries (`common/`)
- `common-core`: Domain models, problem detail exceptions, pagination standards.
- `common-grpc`: Protobuf definitions and generated gRPC service stubs.
- `common-security`: JWT authentication filters, RBAC roles, and authorization utilities.
- `common-logging`: Structured logback configuration with trace/span correlation.
- `common-audit`: Event auditing and compliance ledger.
- `common-industrial`: PLC/MQTT protocol abstractions.

### Frontend Application (`client/warehouse-ui/`)
High-density React 18 + TypeScript + Vite cockpit calibrated specifically for industrial control rooms and 100% browser zoom viewports.
- See full frontend documentation: [`client/warehouse-ui/README.md`](client/warehouse-ui/README.md).

---

## 2. Quick Start

### 1. Start Infrastructure
- **PostgreSQL 17**: Running locally on port 5432 with database `warehouse_db`.
- **Mosquitto MQTT**: Running on port 1883 for real-time telemetry streaming.

### 2. Start Backend (`auth-service`)
```bash
mvn spring-boot:run -pl services/auth-service
```
Backend runs on `http://localhost:8085`.

### 3. Start Frontend (`warehouse-ui`)
```bash
cd client/warehouse-ui
npm install
npm run dev
```
Access the UI at `http://localhost:5173`.

---

## 3. UI/UX Standards & Viewport Calibration

All UI engineering conforms to:
- **Specification Document**: [`docs/client/ui_ux_engineering_specification.md`](docs/client/ui_ux_engineering_specification.md) (RFC-0084).
- **Density Calibration**: Root font size `13px`, compact `210px` navigation shell, and `16px 20px` container padding to eliminate 100% zoom element bloat.
- **Developer Guide**: [`docs/development/DEVELOPER_SETUP_GUIDE.md`](docs/development/DEVELOPER_SETUP_GUIDE.md).
