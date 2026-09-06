# Backend Architecture Standards (Industrial & Manufacturing Grade)

## 1. Architectural Overview

This document defines the standardized, enterprise-grade architecture for Java Spring Boot backend microservices (WMS, WES, WCS, Platform Manager, AI Gateway) operating in industrial manufacturing and automated warehouse environments. It balances strict separation of concerns, high cohesion, low-latency determinism, testability, and regulatory compliance (IEC 62443, IEC 62264 / ISA-95).

```mermaid
graph TD
    Client([External Client / Web UI / Mobile Scanner]) -->|HTTP / JSON| API[API Layer]
  
    subgraph Core Application
        API -->|DTO Records| Business[Business Layer]
        Business -->|Domain Calls| Data[Data Layer]
        Business <-->|Port Calls / Commands| Infra[Infrastructure Layer]
      
        Common[Common Layer] -.->|Shared Constants & Enums| API
        Common -.->|Domain Primitives & Exceptions| Business
        Common -.->|Base Types| Data
        Common -.->|Cross-cutting Helpers| Infra
    end
  
    Data -->|JPA / PostgreSQL JSONB| DB[(PostgreSQL Database)]
    Infra -->|MQTT 5.0 / Telemetry| Broker[[Eclipse Mosquitto (MQTT 5.0)]]
    Infra -->|REST / gRPC / RFC| External[External Enterprise Systems / SAP ERP]
    Infra -->|OPC UA / Eclipse Milo| PLC[Shop Floor PLCs / Sorters / AS-RS]
    Infra -->|MQTT / VDA 5050| IoT[AGVs / AMRs / RFID / Optical Sensors]
    Infra -->|Audit Trail / IEC 62443| Audit[(Tamper-Evident Audit Log)]
```

---

## 2. Directory Layout (Single-Module Baseline)

```text
my-enterprise-service/
├── .mvn/ or gradle/
├── pom.xml or build.gradle.kts
├── Dockerfile
├── README.md
│
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/company/project/
    │   │       ├── Application.java               # Main Spring Boot Application Entry
    │   │       │
    │   │       ├── api/                           # [1] API LAYER (Inbound presentation)
    │   │       │   ├── controller/                # REST Controllers (Web UI & Scanners)
    │   │       │   │   └── OrderController.java
    │   │       │   ├── grpc/                      # gRPC Service Impls (High-speed binary RPC)
    │   │       │   │   └── MasterDataGrpcService.java
    │   │       │   ├── dto/                       # Request & Response contracts (Java records)
    │   │       │   │   ├── request/
    │   │       │   │   │   └── CreateOrderRequest.java
    │   │       │   │   └── response/
    │   │       │   │       └── OrderResponse.java
    │   │       │   └── validation/                # Custom input annotations and validators
    │   │       │       ├── OrderCodeValidator.java
    │   │       │       └── ValidOrderCode.java
    │   │       │
    │   │       ├── business/                      # [2] BUSINESS LAYER (Core domain logic)
    │   │       │   ├── service/                   # Service interfaces
    │   │       │   │   └── OrderService.java
    │   │       │   ├── impl/                      # Business logic implementations & transactions
    │   │       │   │   └── OrderServiceImpl.java
    │   │       │   ├── mapper/                    # MapStruct mappers (DTO <-> Entity)
    │   │       │   │   └── OrderMapper.java
    │   │       │   ├── statemachine/              # Equipment & transport lifecycle state machines
    │   │       │   │   ├── EquipmentTaskState.java
    │   │       │   │   └── EquipmentStateMachine.java
    │   │       │   └── util/                      # Domain-specific calculations & helpers
    │   │       │       └── ProductionMetricCalculator.java
    │   │       │
    │   │       ├── data/                          # [3] DATA LAYER (Persistence)
    │   │       │   ├── entity/                    # JPA Entities (@Version, Lazy fetching)
    │   │       │   │   └── OrderEntity.java
    │   │       │   ├── repository/                # Spring Data Repositories
    │   │       │   │   └── OrderRepository.java
    │   │       │   ├── specification/             # JPA dynamic query criteria
    │   │       │   │   └── OrderSpecification.java
    │   │       │   └── projection/                # Fast read-only query records/interfaces
    │   │       │       └── OrderSummaryView.java
    │   │       │
    │   │       ├── infrastructure/                # [4] INFRASTRUCTURE (Plumbing, hardware, integrations)
    │   │       │   ├── config/                    # Spring @Configuration beans
    │   │       │   │   ├── OpenApiConfig.java
    │   │       │   │   ├── CacheConfig.java
    │   │       │   │   └── properties/            # Validated @ConfigurationProperties records
    │   │       │   │       ├── GraalVmProperties.java
    │   │       │   │       ├── OpcUaProperties.java
    │   │       │   │       └── WarehouseRoutingProperties.java
    │   │       │   ├── security/                  # Hardened Security (OAuth2, mTLS, RBAC, IDOR prevention)
    │   │       │   │   ├── config/
    │   │       │   │   │   └── SecurityConfig.java # Stateless filter chain & hardened security headers
    │   │       │   │   ├── jwt/
    │   │       │   │   │   ├── JwtAuthenticationFilter.java
    │   │       │   │   │   └── JwtClaimsExtractor.java
    │   │       │   │   ├── tenant/                # Facility & multi-tenant context (IDOR protection)
    │   │       │   │   │   ├── FacilityContextHolder.java
    │   │       │   │   │   └── FacilityContextFilter.java
    │   │       │   │   ├── tls/                   # SSL Bundles for mTLS (OPC UA / Mosquitto MQTT)
    │   │       │   │   │   └── IndustrialSslBundleConfig.java
    │   │       │   │   ├── crypto/                # Column-level AES-256-GCM encryption at rest
    │   │       │   │   │   ├── AesGcmCryptoService.java
    │   │       │   │   │   └── EncryptedStringConverter.java
    │   │       │   │   └── evaluator/             # Custom method security expression evaluators
    │   │       │   │       └── FacilityPermissionEvaluator.java
    │   │       │   ├── logging/                   # Automated Log Sanitization & Distributed Tracing
    │   │       │   │   ├── MaskingPatternLayout.java # Redacts passwords, PINs, tokens before disk write
    │   │       │   │   └── MdcCorrelationFilter.java # Injects traceId, facilityId into SLF4J MDC
    │   │       │   ├── filter/                    # Cross-cutting HTTP filters
    │   │       │   │   └── RateLimitingFilter.java
    │   │       │   ├── interceptor/               # Spring MVC HandlerInterceptors
    │   │       │   │   └── PerformanceLoggingInterceptor.java
    │   │       │   ├── audit/                     # Non-repudiable audit logging (IEC 62443 / 21 CFR Part 11)
    │   │       │   │   ├── aspect/
    │   │       │   │   │   └── AuditTrailAspect.java
    │   │       │   │   ├── model/
    │   │       │   │   │   └── AuditRecord.java
    │   │       │   │   └── publisher/
    │   │       │   │       └── AuditLogPublisher.java
    │   │       │   ├── scheduler/                 # @Scheduled cron jobs
    │   │       │   │   └── ShiftReconciliationJob.java
    │   │       │   ├── client/                    # External REST/gRPC/Third-party clients
    │   │       │   │   ├── grpc/                  # gRPC Client Stubs (WcsGrpcClient, FleetGrpcClient)
    │   │       │   │   │   ├── WcsGrpcClient.java
    │   │       │   │   │   └── FleetGrpcClient.java
    │   │       │   │   ├── sap/
    │   │       │   │   └── erp/
    │   │       │   ├── messaging/                 # MQTT 5.0 / Mosquitto publishers & Outbox workers
    │   │       │   │   ├── publisher/
    │   │       │   │   │   └── MqttTelemetryPublisher.java
    │   │       │   │   └── listener/
    │   │       │   │       └── MqttSensorEventListener.java
    │   │       │   └── industrial/                # Southbound Hardware / PLC Communication (IEC 62541)
    │   │       │       ├── opcua/                 # Eclipse Milo OPC UA client & connection pooling
    │   │       │       │   ├── OpcUaSessionManager.java
    │   │       │       │   └── ConveyorPlcClient.java
    │   │       │       ├── mqtt/                  # HiveMQ/Mosquitto MQTT client for sensor telemetry
    │   │       │       │   └── SensorTelemetryConsumer.java
    │   │       │       └── debouncer/             # Physical sensor debounce & deduplication
    │   │       │           └── OpticalSensorDebouncer.java
    │   │       │
    │   │       └── common/                        # [5] COMMON (Cross-cutting primitives)
    │   │           ├── constants/                 # System & application constants
    │   │           │   └── HeaderConstants.java
    │   │           ├── enums/                     # Global status & error codes
    │   │           │   ├── ErrorCode.java
    │   │           │   └── EnvironmentType.java
    │   │           ├── exception/                 # Exceptions & RFC 7807 global handler
    │   │           │   ├── BaseException.java
    │   │           │   ├── ResourceNotFoundException.java
    │   │           │   └── GlobalExceptionHandler.java
    │   │           └── util/                      # Generic language helpers (Monotonic clocks, JSON)
    │   │               ├── TimeUtil.java          # Monotonic System.nanoTime() helpers
    │   │               └── JsonUtil.java
    │   │
    │   └── resources/                             # [6] RESOURCES (Config, migrations, templates)
    │       ├── application.yml                    # Base configuration
    │       ├── application-local.yml              # Local developer overrides
    │       ├── application-dev.yml                # Dev environment config
    │       ├── application-prod.yml               # Production config (uses env vars)
    │       ├── logback-spring.xml                 # Structured JSON logging with MDC traceId
    │       └── db/migration/                      # Versioned Flyway scripts
    │           ├── V1__init_schema.sql
    │           └── V2__create_orders_table.sql
    │
    └── test/
        ├── java/com/company/project/
        │   ├── api/                               # MockMvc / Controller WebLayer tests
        │   ├── business/                          # Mockito isolated unit tests
        │   ├── data/                              # @DataJpaTest Repository tests
        │   ├── integration/                       # Testcontainers (PostgreSQL, Mosquitto MQTT) tests
        │   └── architecture/                      # ArchUnit architectural rule tests
        │       └── ArchitectureTest.java
        └── resources/
            └── application-test.yml
```

---

## 3. Layer Specifications & Responsibilities

### 3.1. API Layer (`api/`)
* **Role**: The boundary receiving HTTP, REST, or mobile scanner requests and returning responses.
* **Components**:
  * `controller/`: Thin endpoints that delegate immediately to services. Controllers must not contain business logic or DB calls.
  * `dto/`: Request and response models. Use Java `record` exclusively to enforce immutability.
  * `validation/`: Custom Jakarta validation annotations and `ConstraintValidator` implementations.
* **Rules**:
  * Never accept or return JPA Entities across the controller boundary.
  * All collection endpoints must accept `Pageable` and return `Page<T>` or `Slice<T>` (unbounded queries are banned).
  * Always annotate parameters with `@Valid` or `@Validated`.

### 3.2. Business Layer (`business/`)
* **Role**: The core domain engine of the service.
* **Components**:
  * `service/` & `impl/`: Define interfaces and their package-private implementations. Manages transaction boundaries via `@Transactional`.
  * `mapper/`: Compile-time mappers (**MapStruct**) that convert between API DTOs and Data Entities.
  * `statemachine/`: Explicit equipment and transport lifecycle state machines modeling physical exception states (`PAUSED`, `FAULT_HOLD`, `E_STOP_INTERRUPTED`, `DEGRADED_MANUAL`).
  * `util/`: Business-specific calculations (cycle times, pick-path routing, capacity heuristics).
* **Rules**:
  * All database operations happen through calls to `data/repository/`.
  * External system notifications and hardware commands are invoked via `infrastructure/`.
  * Read methods must declare `@Transactional(readOnly = true)`. Never perform long network I/O or PLC calls inside an active DB transaction.

### 3.3. Data Layer (`data/`)
* **Role**: Data persistence and database queries.
* **Components**:
  * `entity/`: JPA entities mapping tables, foreign keys, and indexes. Must include `@Version` on mutable entities and JSONB custom attributes (`@JdbcTypeCode(SqlTypes.JSON)`).
  * `repository/`: Spring Data JPA repository interfaces extending `JpaRepository` and `JpaSpecificationExecutor`.
  * `specification/`: Reusable predicate builders for dynamic filtering.
  * `projection/`: Fast read-only interface or record projections.
* **Rules**:
  * Lombok `@Data` and `@EqualsAndHashCode` are **strictly banned** on JPA entities.
  * Eager fetching is banned; all associations must be `FetchType.LAZY`.

### 3.4. Infrastructure Layer (`infrastructure/`)
* **Role**: Houses framework plumbing, external enterprise integration, hardened cybersecurity, and physical shop-floor hardware communication.
* **Components**:
  * `config/properties/`: Strongly typed, immutable `@ConfigurationProperties` records validated at startup.
  * `security/`: Hardened enterprise and industrial security architecture:
    * `config/SecurityConfig.java`: Stateless `SecurityFilterChain` enforcing OWASP security headers (HSTS, CSP, X-Frame-Options DENY, nosniff).
    * `jwt/`: Asymmetric token signature validation and claim extraction (`userId`, `roles`, `facilityId`).
    * `tenant/FacilityContextHolder.java`: Propagates authenticated `facilityId` via `ThreadLocal` / `ScopedValue` to enforce multi-warehouse query scoping (IDOR prevention).
    * `tls/IndustrialSslBundleConfig.java`: Configures Spring Boot 3.1+ SSL Bundles for Mutual TLS (mTLS) across OPC UA and Mosquitto MQTT connections.
    * `evaluator/FacilityPermissionEvaluator.java`: Custom evaluator for method-level `@PreAuthorize` authorization rules.
  * `filter/` & `interceptor/`: Cross-cutting HTTP filters (`OncePerRequestFilter`) propagating `traceId`/`spanId` into SLF4J MDC and sanitizing sensitive authorization headers.
  * `audit/`: Non-repudiable audit logging interceptor (`@AuditOverride`) capturing physical setpoint changes and manual diverter overrides (IEC 62443 / 21 CFR Part 11).
  * `client/`: HTTP/gRPC clients connecting to external systems (ERP, SAP).
  * `messaging/`: Eclipse Mosquitto MQTT 5.0 publishers/subscribers and PostgreSQL Transactional Outbox workers.
  * `industrial/`: Southbound communication with physical equipment:
    * `opcua/`: Eclipse Milo OPC UA client enforcing `Basic256Sha256` encryption and X.509 certificate validation (`SecurityPolicy.None` banned).
    * `mqtt/`: HiveMQ reactive MQTT client communicating over MQTT 5.0 with Eclipse Mosquitto for shop-floor IoT sensors and AGV VDA 5050 telemetry.
    * `debouncer/`: Software sliding-window deduplication (200–500ms) for RFID and optical scanner telemetry.
* **Rules**:
  * All calls to PLCs must use bounded thread pools, Resilience4j rate limiters, and explicit socket timeouts ($\le$ 2000ms).

### 3.5. Common Layer (`common/`)
* **Role**: Cross-cutting primitives and domain-agnostic helpers.
* **Components**:
  * `constants/`: Global headers, regex patterns, system constants.
  * `enums/`: System-level enums (`ErrorCode`, `EnvironmentType`).
  * `exception/`: Base business exceptions and centralized `@RestControllerAdvice` emitting RFC 7807 `ProblemDetail`.
  * `util/`: Helper utilities, including monotonic clock utilities (`System.nanoTime()`).
* **Rules**:
  * Must **never** import classes from `api/`, `business/`, `data/`, or `infrastructure/`.

---

## 4. Multi-Module Monorepo Architecture (Industrial Pure-Java Layout)

The platform is structured as a unified Maven Multi-Module Monorepo producing standalone, isolated executable JARs for on-premises bare-metal execution:

```text
Warehouse_orchestrator/
├── pom.xml                                  # Root POM managing Java 21, Spring Boot 3.3+, and dependencies
│
├── common/                                  # Shared Pure-Java Libraries (Non-runnable JARs)
│   ├── common-core/                         # Base records, monotonic time utils, RFC 7807 exceptions
│   ├── common-grpc/                         # Protobuf schemas (.proto) & auto-generated gRPC stubs
│   │   └── src/main/proto/
│   │       ├── master_data_sync.proto       # MasterDataSyncService (WES -> Subsystems)
│   │       ├── conveyor_divert.proto        # ConveyorDivertService (WES <-> WCS)
│   │       └── fleet_mission.proto          # FleetMissionService (WES <-> AGVs)
│   ├── common-security/                     # JWT parser, FacilityContext (IDOR), AES-GCM crypto, mTLS
│   ├── common-logging/                      # Sensitive data masking layout, MDC correlation filter
│   ├── common-audit/                        # Non-repudiable audit trail aspect (IEC 62443)
│   └── common-industrial/                   # Sensor debouncers, VDA 5050 models, OPC UA helpers
│
├── services/                                # Independent Standalone Executable JVM Services
│   ├── gateway-service/                     # [Port 443] Spring Cloud Gateway + Bundled React UI
│   ├── wes-service/                         # [Port 8081] Core WES Master Data Hub & Outbox WAN Sync
│   ├── wms-service/                         # [Port 8082] Sub-WMS: Local Bin Inventory & Storage
│   ├── wcs-service/                         # [Port 8083] Floor Machine Control: Conveyors & Sorters
│   ├── asrs-wcs-service/                    # [Port 8085] High-Bay Machine Control: Stacker Cranes & Forks
│   └── fleet-service/                       # [Port 8084] AGV/AMR Fleet Manager (VDA 5050 gRPC Adapter)
│
├── client/                                  # Frontend UI (React 18 + TypeScript)
│   └── warehouse-ui/                        # Builds static assets into gateway-service for offline use
│
└── scripts/                                 # Bare-Metal OS Automation
    ├── onprem/                              # start-warehouse.sh, stop-warehouse.sh
    └── db/                                  # init-schemas.sql (wes_db, wms_db, wcs_db)
```

---

## 5. Architectural Rules & Automated Verification (ArchUnit)

Enforce strict architectural layer boundaries automatically in the CI pipeline using `ArchitectureTest.java`:

```java
package com.company.project.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;

@AnalyzeClasses(packages = "com.company.project", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchitectureTest {

    @ArchTest
    static final ArchRule layered_architecture_rules = layeredArchitecture()
        .consideringAllDependencies()
        .layer("API").definedBy("..api..")
        .layer("Business").definedBy("..business..")
        .layer("Data").definedBy("..data..")
        .layer("Infrastructure").definedBy("..infrastructure..")
        .layer("Common").definedBy("..common..")

        .whereLayer("API").mayNotBeAccessedByAnyLayer()
        .whereLayer("API").mayOnlyAccessLayers("Business", "Common")
        .whereLayer("Business").mayOnlyAccessLayers("Data", "Infrastructure", "Common")
        .whereLayer("Data").mayOnlyBeAccessedByLayers("Business", "Infrastructure")
        .whereLayer("Common").mayNotAccessAnyLayer();

    @ArchTest
    static final ArchRule controllers_must_not_access_repositories =
        noClasses().that().resideInAPackage("..api.controller..")
                   .should().dependOnClassesThat()
                   .resideInAPackage("..data.repository..");

    @ArchTest
    static final ArchRule entities_must_not_use_lombok_data =
        noClasses().that().resideInAPackage("..data.entity..")
                   .should().beAnnotatedWith("lombok.Data")
                   .orShould().beAnnotatedWith("lombok.EqualsAndHashCode");

    @ArchTest
    static final ArchRule no_standard_streams_allowed =
        NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;

    @ArchTest
    static final ArchRule industrial_libraries_isolated_to_infrastructure =
        classes().that().dependOnClassesThat().resideInAPackage("org.eclipse.milo..")
                 .should().resideInAPackage("..infrastructure.industrial..");

    @ArchTest
    static final ArchRule mutating_services_must_be_secured =
        methods().that().areDeclaredInClassesThat().resideInAPackage("..business.service..")
                 .and().haveNameMatching("^(create|update|delete|allocate|override|execute).*")
                 .should().beAnnotatedWith("org.springframework.security.access.prepost.PreAuthorize")
                 .orShould().beAnnotatedWith("jakarta.annotation.security.RolesAllowed");
}
```

---

## 6. Enterprise Best Practices Checklist

1. **DTO Immutability**: All request and response objects must be Java `record`s.
2. **Compile-Time Mapping**: Use **MapStruct** with `@Mapper(componentModel = "spring")` exclusively.
3. **RFC 7807 Error Handling**: Centralized `@RestControllerAdvice` returning `ProblemDetail`.
4. **Zero DDL Auto in Production**: Use `spring.jpa.hibernate.ddl-auto=validate` with versioned Flyway migrations.
5. **Observability**: Prometheus metrics via `/actuator/prometheus` and MDC `traceId`/`spanId` logging.
6. **Industrial Monotonic Clocks**: `System.nanoTime()` for duration checks; `Instant.now()` (UTC microseconds) for event logging.
7. **Package-Private Encapsulation**: Keep service implementations (`ServiceImpl`) and entity classes package-private whenever possible.
8. **Supply Chain Security**: CycloneDX SBOM generated on every build; zero dependencies with CVSS $\ge$ 7.0.
9. **Zero-Trust Security**: Stateless JWTs, declarative method authorization (`@PreAuthorize`), and strict `facilityId` scoping on all queries (IDOR prevention).
10. **Industrial mTLS (IEC 62443)**: Mutual TLS with X.509 certificate validation across OPC UA, gRPC channels, and inter-service communication (`SecurityPolicy.None` banned).
11. **gRPC Inter-Service Communication**: High-speed binary Protocol Buffers over HTTP/2 (`common-grpc`) for all synchronous communication between WES and subsystems.
12. **WES Master Data Authority**: WES is the single source of truth for materials, pallet footprints, and storage conditions; subsystems synchronize over gRPC via `MasterDataSyncService`.


