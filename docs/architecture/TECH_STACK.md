# Enterprise Technology Stack & BOM Specification

## 1. Overview & Architecture Philosophy

This document defines the standardized technology stack for the **Warehouse Orchestrator Platform**. Technology choices are driven by four non-negotiable principles:
1. **Low-Latency Determinism**: Sub-millisecond GC pauses to prevent conveyor jams and machine timing trips.
2. **Industrial Compliance**: Conformance to IEC 62443 (Cybersecurity), IEC 62264 (ISA-95), and IEC 62541 (OPC UA).
3. **Compile-Time Safety**: Immutability, zero reflection in hot paths, and strict type checking.
4. **Supply Chain Integrity**: Verifiable dependencies, automated SBOM generation, and zero unpatched CVEs.

---

## 2. Core Technology Matrix

| Layer / Domain | Technology | Version | Purpose / Scope |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | **Java (LTS)** | `21 (OpenJDK Temurin)` | Primary backend language; utilizes Virtual Threads (Loom) and Generational ZGC. |
| **Backend Framework** | **Spring Boot** | `3.3.x+` | Core microservice framework (Spring MVC, Spring Data JPA, Spring Security). |
| **Frontend Framework** | **React / TypeScript** | `React 18+ / TS 5+` | Web portal, workstation picking displays, supervisory control room UI. |
| **AI / Machine Learning** | **Python / FastAPI** | `Python 3.11+` | Route optimization, slotting heuristics, and predictive maintenance telemetry. |
| **Relational Database** | **PostgreSQL** | `16.x+` | Primary transactional store; native JSONB for custom digital twin attributes. |
| **Time-Series Telemetry** | **TimescaleDB** | `2.14+ (Postgres Ext)` | High-frequency physical sensor data (temperature, motor currents, vibration). |
| **Event & IoT Broker** | **Eclipse Mosquitto** | `2.0.x+ (MQTT 5.0/3.1.1)`| Shop-floor AGV/AMR telemetry (VDA 5050), barcode terminals, sensor telemetry, and pub/sub events. |
| **Reliable Event Bus** | **PostgreSQL Transactional Outbox** | `16.x+ (Native / Polling)`| Guaranteed at-least-once cross-service domain event delivery without Kafka operational overhead. |
| **Industrial Protocol (PLC)**| **Eclipse Milo** | `0.6.14+` | Official Java IEC 62541 OPC UA client (mTLS with X.509 certificates). |
| **Identity & Access** | **Keycloak / Local DB** | `24.x+ / Argon2id` | Dual-mode identity provider: Local DB/RFID badge authentication + Enterprise OIDC/SAML SSO. |

---

## 3. Approved Curated Libraries (Backend BOM)

| Domain | Approved Library | Version | Rationale & Strict Policy |
| :--- | :--- | :--- | :--- |
| **Object Mapping** | **MapStruct** | `1.5.5.Final` | **Mandatory.** Generates compile-time mapping code with zero reflection and zero GC overhead. |
| **JSON Serialization** | **Jackson 2.x** | `2.17.x+` | **Mandatory.** Integrated with Spring Boot. Must use explicit `@JsonSubTypes` whitelisting. |
| **Resilience & Fault Tolerance**| **Resilience4j** | `2.2.0+` | **Mandatory.** Circuit breakers, rate limiters, and retries for southbound PLC calls. |
| **Database Migrations** | **Flyway** | `10.x+` | **Mandatory.** Version-controlled, immutable schema migrations (`V{version}__{desc}.sql`). |
| **Dynamic SQL / Reporting** | **jOOQ** / JPA Specs | `3.19.x+` | **Mandatory for reporting.** Type-safe query construction; no raw string concatenations. |
| **Distributed Tracing** | **Micrometer Tracing** | `1.3.x+` | Automatically injects `traceId` and `spanId` into SLF4J MDC across HTTP, gRPC, and MQTT. |
| **Observability Telemetry** | **OpenTelemetry SDK** | `1.35.x+` | Vendor-neutral telemetry export to Prometheus, Grafana, and Loki. |
| **Integration Testing** | **Testcontainers / Embedded** | `1.19.x+` | Real PostgreSQL and Mosquitto MQTT test fixtures for integration tests. |
| **Architectural Rules** | **ArchUnit** | `1.3.0+` | Enforces 6-layer architecture boundaries and coding rules in JUnit test suites. |

---

## 4. Prohibited Technologies & Banned Anti-Patterns

| Category | Strictly Banned Technology | Approved Alternative | Reason for Prohibition |
| :--- | :--- | :--- | :--- |
| **Object Mapping** | `ModelMapper`, `Dozer`, `Orika` | **MapStruct** | Heavy runtime reflection, high memory allocation, silent runtime mapping errors. |
| **JSON Serialization** | `Gson`, `FastJSON`, `org.json` | **Jackson 2.x** | FastJSON has critical historical CVEs; mixing Gson introduces conflicting date/time serializers. |
| **In-Memory Testing DB**| `H2 Database` (for integration) | **Testcontainers (PostgreSQL)** | Dialect mismatches (PostgreSQL JSONB and sequences differ drastically from H2). |
| **Fault Tolerance** | `Netflix Hystrix` | **Resilience4j** | Hystrix is completely deprecated, unmaintained, and incompatible with Virtual Threads. |
| **Schema Generation** | `hibernate.ddl-auto: update` | **Flyway** | Destructive, non-deterministic schema mutations in production are catastrophic for 24/7 factories. |
| **Industrial Protocol** | `Custom raw TCP/IP sockets` | **Eclipse Milo (OPC UA)** | Lacks standardized security profiles, heartbeat recovery, and IEC 62541 certification. |
| **Dependency Injection**| `@Autowired private Field;` | **Constructor Injection** | Breaks immutability, hides dependencies, and impedes clean unit testing. |

---

## 5. Build, Packaging & Supply Chain Governance

```
Source Code (Git) 
   │
   ├──> Spotless (Code format gate)
   ├──> Compile & JaCoCo (80%+ Coverage gate)
   ├──> ArchUnit (Architecture rule gate)
   ├──> CycloneDX Maven Plugin (Generates target/bom.json)
   ├──> Trivy / OWASP Dependency-Check (Fails if CVE CVSS >= 7.0)
   │
   └──> Multi-stage Container Build (Distroless / Eclipse Temurin JRE 21)
```

1. **Software Bill of Materials (SBOM)**:
   - Generated automatically during `mvn clean verify` using `cyclonedx-maven-plugin`.
   - Exported as standard CycloneDX JSON (`target/bom.json`) and archived with release artifacts.
2. **Container Base Image**:
   - Production Docker images must use **`eclipse-temurin:21-jre-alpine`** or **Distroless Java (`gcr.io/distroless/java21-debian12`)** to minimize operating system CVE vulnerability surface.
   - Running as `root` inside containers is **strictly banned**; use a dedicated `appuser` (UID 10001).
