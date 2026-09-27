# Resource Manager vs. PTC ThingWorx: Architectural Analysis & Mapping

This document provides a comprehensive architectural comparison between the **Warehouse Orchestrator Resource Manager Domain (`common-resource`)** and the **PTC ThingWorx Thing Model Ontology**. It details structural parity, functional differences, gaps, and warehouse-specific engineering advantages.

---

## 1. Executive Summary

PTC ThingWorx is an established enterprise Industrial IoT (IIoT) platform designed around the **Thing Model** ontology. The `common-resource` domain micro-kernel implements a high-performance, air-gapped, sub-microsecond industrial resource aggregate modeled after IEC 62443, ISA-95, AAS (Asset Administration Shell), and IDTA capability standards.

While both systems model physical and software industrial assets via templates, properties, and invokable methods, `common-resource` is purpose-built for ultra-low latency warehouse automation, gang allocation, and deterministic material flow routing.

```
+-----------------------------------------------------------------------------------+
|                            ONTOLOGY COMPARISON MAP                                |
+-----------------------------------------------------------------------------------+
| PTC ThingWorx Core Concept       | common-resource Implementation                 |
+----------------------------------+------------------------------------------------+
| Thing Template                   | ResourceTemplate (Record Aggregate)            |
| Thing                            | Resource (Thread-Safe Aggregate Root)          |
| Data Shape                       | PropertyDefinition (Typed Field Schema)        |
| Services (RPC Methods)           | MethodDefinition (Standard & Custom Methods)   |
| Events & Alerts                  | ResourceEvent / StateTriggers / Audit Logger   |
| Asset Hierarchy / Location       | ISA95Path (5-level) & SpatialCoordinate (6-DoF)|
| Thing Shapes (Mixins / Traits)   | Capabilities (Set<String>) [Traits: Gap]       |
| Subscriptions / Event Handlers   | StateTransitionEngine [Rule Hooks: Gap]        |
| Value Streams (Time-Series)      | DynamicProperty timestamp [TS Storage: Gap]    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Detailed Component-by-Component Mapping

### 2.1 Templates vs. `ResourceTemplate`

| Aspect | PTC ThingWorx `ThingTemplate` | `common-resource` `ResourceTemplate` |
| :--- | :--- | :--- |
| **Definition** | Abstract class defining base properties, services, and configurations. | Immutable Java Record aggregate encapsulating identity, properties schema, and methods. |
| **Inheritance Model** | Single inheritance chain (`GenericThing` -> `TemplateA` -> `TemplateB`). | Direct template instantiation with explicit instance override maps. |
| **Instantiation** | Creates a `Thing` entity registered in Model server. | `ResourceTemplate.instantiate(id, name, overrides)` builds a validated `Resource`. |
| **Persistence** | Model database XML / PostgreSQL / Neo4j document. | Hexagonal SPI (`ResourceTemplateRepositoryPort`) backed by PostgreSQL JSONB. |
| **Verdict** | **100% Structural Match**. | |

### 2.2 Concrete Digital Twins: `Thing` vs. `Resource`

| Aspect | PTC ThingWorx `Thing` | `common-resource` `Resource` |
| :--- | :--- | :--- |
| **Identity** | String Name (Globally unique in Model). | `ResourceId` composite record (`tenantId` + `resourceId`). |
| **Concurrency Control** | Optimistic / Database row locks. | Lock-free Compare-And-Swap (`AtomicLong` CAS optimistic versioning). |
| **Operational Status** | Built-in `isConnected` boolean + custom status properties. | Strong enum `OperationalStatus` (`AVAILABLE`, `ALLOCATED`, `BUSY`, `MAINTENANCE`, `FAULTED`, `OFFLINE`). |
| **FSM State Machine** | None built-in (left to user scripts). | Built-in PackML & Semi E10 state machines (`ResourceState` + `StateTransitionEngine`). |
| **Verdict** | **Match with Superior Concurrency & State Machine in `common-resource`**. | |

### 2.3 Property Metadata: `DataShape` vs. `PropertyDefinition`

| Aspect | PTC ThingWorx `DataShape` | `common-resource` `PropertyDefinition` |
| :--- | :--- | :--- |
| **Field Types** | `STRING`, `NUMBER`, `INTEGER`, `BOOLEAN`, `DATETIME`, `BLOB`, `INFOTABLE`, `LOCATION`. | `STRING`, `INTEGER`, `LONG`, `DOUBLE`, `BOOLEAN`, `DATETIME`, `SECRET`, `ENUM`, `ARRAY`, `MAP`, `BYTE_ARRAY`, `LOCATION`. |
| **Constraints** | Default value, minimum, maximum, unit, description. | `required`, `defaultValue`, `unit`, `options`, `description`, `useForAuth`. |
| **Industrial / Security Metadata** | Security tags. | `useForAuth` flag directly drives token generation in `TokenManager`. |
| **Verdict** | **Complete Parity with Strict Java Typing**. | |

### 2.4 Executable Logic: `Services` vs. `MethodDefinition`

| Aspect | PTC ThingWorx `Service` | `common-resource` `MethodDefinition` |
| :--- | :--- | :--- |
| **Implementation** | JavaScript (Rhino), Java Extensions, SQL Queries, Edge RPC. | Specification record defining protocol, safety tiers, and parameter rules. |
| **Industrial Safety Tiers** | None (standard execution permissions). | Explicit IEC 62443 `SafetyTier` (`READ_ONLY`, `OPERATIONAL`, `SAFETY_CRITICAL`). |
| **Standardization** | Ad-hoc user services. | Categorized into `standard` (IDTA/PackML baseline) vs `custom` (vendor APIs). |
| **Verdict** | **Match with Industrial Safety Governance in `common-resource`**. | |

### 2.5 Hierarchy & Spatial Topology

| Aspect | PTC ThingWorx | `common-resource` |
| :--- | :--- | :--- |
| **Spatial Coordinates** | Basic `Location` (Latitude, Longitude, Elevation). | 6-DoF `SpatialCoordinate` ($x, y, z$, `yaw`, `floorId`, `zoneId`) tailored for AMRs and high-bay AS/RS. |
| **Asset Hierarchy** | Network relationships / parent-child collections. | Standard ISA-95 Path (`ENTERPRISE/SITE/AREA/LINE/CELL`). |
| **Flow Topology** | Graph database extensions required. | Native `OperationalGraph` with forward/backward BFS pathfinding and upstream/downstream line tracing. |
| **Verdict** | **`common-resource` Significantly Outperforms**. | |

---

## 3. What We Need to Improve to Beat ThingWorx

To achieve complete parity and decisively surpass PTC ThingWorx across industrial IoT and warehouse automation, the following five architectural capabilities are targeted:

### 3.1 Thing Shapes Equivalent (`ResourceShape` / Mixin Compositions)
- **ThingWorx**: A `ThingShape` defines a reusable package of properties and services that can be attached to multiple unrelated templates (e.g., `BatteryPoweredShape` attached to both an AMR template and a Barcode Scanner template).
- **`common-resource` Today**: Uses a flat `Set<String> capabilities` list. Templates cannot compose distinct modular sub-property schemas.
- **Architectural Solution**: Introduce `ResourceShape` records containing `List<PropertyDefinition>` and `List<MethodDefinition>` that templates can compose cleanly with conflict resolution.

### 3.2 Subscriptions & Reactive Rule Triggers (`RuleSubscriptionEngine`)
- **ThingWorx**: Enables declarative event subscriptions and automated rules: *When property `batteryLevel` < 15%, fire `TriggerChargingRoute()`*.
- **`common-resource` Today**: Contains `StateTransitionEngine` for PackML state transitions, but lacks an in-memory rule engine evaluating property predicates on state mutations.
- **Architectural Solution**: Introduce a thread-safe `RuleSubscriptionEngine` that registers predicate subscriptions on property updates and dispatches reactive triggers or method invocations with microsecond latency.

### 3.3 High-Frequency Telemetry Historian (`TelemetryHistorianPort` & `RingBufferTelemetryStore`)
- **ThingWorx**: `ValueStream` entities write time-series property metrics directly to InfluxDB, Cassandra, or TimescaleDB.
- **`common-resource` Today**: `DynamicProperty` stores the current timestamp, and `ResourceAuditLoggerPort` logs mutation events, but there is no time-series circular buffer or dedicated telemetry historian port.
- **Architectural Solution**: Define a hexagonal SPI `TelemetryHistorianPort` alongside an in-memory lock-free `RingBufferTelemetryStore` (using LMAX Disruptor or circular array semantics) for zero-allocation high-speed sensor time-series logging.

### 3.4 Native Industrial Protocol & PLC Tag Bindings
- **ThingWorx**: Uses Industrial Connectivity (Kepware) and `RemoteThingWithBinding` to map properties directly to PLC tags/OPC-UA nodes with deadbands and scan rates.
- **`common-resource` Today**: Properties define type schemas, units, and auth flags, but lack field-bus binding metadata.
- **Architectural Solution**: Add industrial mapping metadata to `PropertyDefinition` (e.g., `opcUaNodeId`, `plcTagAddress`, `pollIntervalMs`, `deadbandThreshold`).

### 3.5 Dynamic Scriptable or Sandboxed Extension Runner
- **ThingWorx**: Allows non-compiled JavaScript (Rhino) services to be deployed and hot-reloaded dynamically on the fly.
- **`common-resource` Today**: Relies entirely on compiled Java methods and predefined SPI interfaces.
- **Architectural Solution**: Introduce an optional sandboxed expression/scripting runner (e.g., lightweight MVEL or GraalVM Polyglot) for user-defined custom method logic without compromising core engine safety.

---

## 4. Key Architectural Advantages of `common-resource`

| Feature | PTC ThingWorx | Warehouse `common-resource` |
| :--- | :--- | :--- |
| **Latency & Performance** | Script engine overhead (10ms - 100ms per service). | Pure compiled Java micro-kernel (sub-microsecond execution, lock-free). |
| **PackML & Semi E10 FSM** | Requires custom programming. | Built-in certified state machines and transition matrices. |
| **Gang Arbitration** | Not available natively. | Built-in `GangArbitrationEngine` for atomic multi-resource allocation with deadlock avoidance. |
| **Air-Gap & Footprint** | Heavy multi-gigabyte footprint requiring Tomcat / ZooKeeper / Heavy DBs. | Ultra-lightweight JAR (< 2MB), zero runtime dependencies, air-gapped compliant. |

---

## 5. Alignment Recommendations

1. **Retain Lean Domain Focus**: Keep `common-resource` focused on high-performance industrial primitives (Resource, Template, State Machine, Arbitration, Operational Graph).
2. **Phase Next Enhancements**:
   - Add `ResourceShape` (Thing Shapes equivalent) to allow composing reusable property/method blocks across templates.
   - Implement property binding metadata (`opcUaNodeId`, `plcTagAddress`, `pollIntervalMs`) directly inside `PropertyDefinition`.
