# CORE LIBRARIES & SUBSYSTEM ARCHITECTURE PLAN
## 3-Pillar Separation: OT Connect, Physical Resources, and Software Resources

---

## 1. Architectural Blueprint: The 3-Pillar Separation

```
+===================================================================================================+
|                                    UPSTREAM CORE LIBRARIES                                        |
|                                                                                                   |
|  +---------------------------+   +---------------------------+   +-----------------------------+  |
|  |     1. OT PROTOCOLS       |   |   2. PHYSICAL RESOURCE    |   |    3. SOFTWARE RESOURCE     |  |
|  |        (ot-connect)       |   |    (resource-manager)     |   |  (common-software-client)   |  |
|  |                           |   |                           |   |                             |  |
|  | • OPC UA Driver           |   | • PackML (ISA-TR88) FSM   |   | • [ALREADY AVAILABLE IN WO] |  |
|  |   - Eclipse Milo 0.6.14   |   | • SEMI E10 RAM Engine     |   | • Dynamic REST HTTP Client  |  |
|  |   - MonitoredItems push   |   | • Gang Arbitration       |   | • OAuth2 & Token Management |  |
|  |   - S7-1500 PLC Simulator |   |   (Deadlock-Free Leases)  |   | • Dynamic Payload Engine    |  |
|  | • Modbus TCP / RTU        |   | • 3D Spatial Coordinates  |   | • Field Mapping Rules       |  |
|  |   - FC01 to FC16 Codecs   |   | • Operational Graph       |   | • XML / JSON Data Engines   |  |
|  |   - Register Poller       |   |   (FEEDS / INTERLOCKS)    |   | • External API Dispatcher   |  |
|  | • Unified DeviceGateway   |   | • [COPIED AS-IS from      |   |                             |  |
|  |   (connect, read, write)  |   |    reseach/resource_mgr]  |   |                             |  |
|  +---------------------------+   +---------------------------+   +-----------------------------+  |
+===================================================================================================+
                 │                               │                               │
                 │ Maven JAR                     │ Maven JAR                     │ Internal WO Module
                 ▼                               ▼                               ▼
+===================================================================================================+
|                     Warehouse_orchestrator / common / (SHARED BRIDGES)                            |
|                                                                                                   |
|  +---------------------------+   +---------------------------+   +-----------------------------+  |
|  |     common-industrial     |   |      common-resource      |   |   common-software-client    |  |
|  |                           |   |                           |   |                             |  |
|  | • Bridges OT Connect      |   | • Bridges Resource Engine |   | • Bridges Software Endpoints|  |
|  | • Spring GatewayFactory   |   | • Spring ResourceClient   |   | • Spring REST Client Engine |  |
|  | • Telemetry Event Broad-  |   | • JpaResourceRepository   |   | • WMS/ERP Credential        |  |
|  |   caster (Kafka/MQTT)     |   |   (PostgreSQL Adapter)    |   |   Provider                  |  |
|  +---------------------------+   +---------------------------+   +-----------------------------+  |
+===================================================================================================+
                 │                               │                               │
                 ▼                               ▼                               ▼
+===================================================================================================+
|                              MICROSERVICES CONSUMPTION (services/)                                |
|                                                                                                   |
|  • asrs-wcs-service  ──> Uses: common-industrial (OPC UA) + common-resource (Crane FSM & 3D Bay)  |
|  • wcs-service       ──> Uses: common-industrial (Modbus/OPC) + common-resource (Conveyor Graph)  |
|  • fleet-service     ──> Uses: common-resource (Spatial Tracking & AGV State)                     |
|  • wes-service       ──> Uses: common-resource (Gang Arbitration) + common-software-client (WMS)   |
|  • wms-service       ──> Uses: common-software-client (ERP / Host REST Integration)                |
+===================================================================================================+
```

---

## 2. Pillar 1: OT Protocols (`ot-connect`)

**Directory**: `reseach/ot_connect/` (produces `org.platform:ot-connect:1.0.0-SNAPSHOT`)

Groups all Operational Technology (OT) fieldbus protocols under a unified driver interface:

```
ot_connect/
├── pom.xml                                   # Milo OPC UA + Modbus dependencies
└── src/main/java/org/platform/gateway/
    │
    ├── api/                                  # Unified Driver SPI
    │   ├── DeviceGateway.java                # Standard interface: connect, read, write, subscribe
    │   ├── TagAddress.java                   # Universal address (e.g., "opc:ns=2;s=Crane.Speed" or "modbus:40001")
    │   ├── DataPoint.java                    # Immutable record: value, QualityStatus, timestamp
    │   └── QualityStatus.java                # GOOD, BAD, UNCERTAIN, COMM_FAILURE
    │
    ├── opcua/                                # [COPIED AS-IS from reseach/opc_ua_platform]
    │   ├── client/api/                       # OpcUaClient, BatchWriter, AddressSpaceBrowser
    │   ├── client/session/                   # SessionRegistry, SecurityProfile (Basic256Sha256)
    │   ├── client/subscription/              # SubscriptionEngine, MonitoredItem listeners
    │   └── server/                           # Virtual Siemens S7-1500 PLC simulator
    │
    └── modbus/                               # Modbus Fieldbus Engine
        ├── client/                           # Non-blocking Modbus TCP & RTU client
        ├── codec/                            # FC01-FC16 codecs, register word swapping, IEEE 754 float
        └── poller/                           # Virtual-thread cyclic register poller
```

---

## 3. Pillar 2: Physical Resource Engine (`resource-manager`)

**Directory**: `reseach/resource_manager/` (produces `org.platform:resource-manager-core:1.0.0-SNAPSHOT`)

> **Confirmation**: Uses all existing files created in `reseach/resource_manager`. Zero code is recreated.

```
resource_manager/
├── pom.xml                                   # Pure Java 17, Zero framework lock-in (<500KB)
└── src/main/java/org/platform/resourcemanager/
    │
    ├── api/                                  # ResourceClient facade, immutable request/response records
    ├── domain/
    │   ├── model/                            # Resource, ResourceId, SpatialCoordinate, DynamicProperty
    │   ├── fsm/                              # PackML (ISA-TR88) & SEMI E10 state machines
    │   ├── arbitration/                      # Deadlock-free Gang Arbitration & Lease engine
    │   ├── capability/                       # Parameter validation & proximity matchmaker
    │   └── topology/                         # OperationalGraph (PART_OF, FEEDS, INTERLOCKED_WITH)
    └── application/port/                     # Hexagonal SPIs: ResourceRepositoryPort, EventPublisherPort
```

---

## 4. Pillar 3: Software Resource Engine (`common-software-client`)

> **Confirmation**: This is **already fully implemented and available in WO** under `Warehouse_orchestrator/common/common-software-client`. It does not need to be built in research.

```
Warehouse_orchestrator/common/common-software-client/
├── pom.xml
└── src/main/java/com/company/warehouse/common/client/software/
    ├── http/                                 # RestClientConfig, AuthInterceptor, HttpLogging
    ├── token/                                # TokenManager, OAuth2 token renewal & caching
    ├── engine/                               # DynamicPayloadEngine, DynamicResponseExtractor
    ├── mapping/                              # DynamicMappingEngine, FieldMappingRule
    ├── parser/                               # UniversalDataParser (JSON Engine, XML Engine)
    ├── rules/                                # RuleEngineDispatcher, NumericComparison, KeyValueMatch
    └── model/                                # ResourceConnectionConfig, ResourceConfigProvider
```

---

## 5. Warehouse Orchestrator: `common/` Folder Structure

In `Warehouse_orchestrator`, the `common/` modules cleanly map 1-to-1 to each pillar:

```
Warehouse_orchestrator/
└── common/
    ├── pom.xml
    ├── common-core/                          # Global base exceptions & domain records
    ├── common-grpc/                          # Protobuf contracts & gRPC stubs
    ├── common-security/                      # JWT authentication & RBAC
    ├── common-logging/                       # Structured Logback tracing
    ├── common-audit/                         # Compliance audit ledger
    │
    ├── common-industrial/                    # [PILLAR 1: BRIDGES ot-connect]
    │   ├── pom.xml                           # Consumes org.platform:ot-connect
    │   └── src/.../gateway/                  # SpringDeviceGatewayFactory (OPC UA / Modbus)
    │
    ├── common-resource/                      # [PILLAR 2: BRIDGES resource-manager-core]
    │   ├── pom.xml                           # Consumes org.platform:resource-manager-core
    │   └── src/.../resource/                 # SpringResourceClient, JpaResourceRepository
    │
    └── common-software-client/               # [PILLAR 3: ALREADY IN WO]
        ├── pom.xml                           # Consumes Jackson, Spring WebClient
        └── src/.../software/                 # Dynamic REST mapping, OAuth2 token management
```

---

## 6. Matrix of Subsystem Usage

| Service | Pillar 1: OT Protocols (`common-industrial` $\rightarrow$ `ot-connect`) | Pillar 2: Physical Resource (`common-resource` $\rightarrow$ `resource-manager`) | Pillar 3: Software Resource (`common-software-client`) |
| :--- | :---: | :---: | :---: |
| **`asrs-wcs-service`** | **YES** (OPC UA to Crane PLC) | **YES** (Crane 3D Coordinates & PackML) | No |
| **`wcs-service`** | **YES** (Modbus & OPC UA to Conveyors) | **YES** (Conveyor Topology Graph) | No |
| **`fleet-service`** | **YES** (VDA 5050 / MQTT) | **YES** (AGV Spatial Tracking & FSM) | No |
| **`wes-service`** | No (Delegates to WCS) | **YES** (Gang Arbitration across WCS) | **YES** (WMS/ERP REST Endpoints) |
| **`wms-service`** | No | No | **YES** (Host ERP Integration) |
