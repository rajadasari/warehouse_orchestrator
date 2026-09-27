# Core Industrial Libraries: Implementation Plan
## Resource Manager & Industry Device Gateway (OPC UA & Modbus)

This document outlines the architecture, module decomposition, and phased engineering roadmap for building and integrating the **Resource Manager** and **Industry Device Gateway** core libraries.

---

## 1. Architectural Structure

The libraries are organized into an independent, modular multi-module project (e.g. `industrial-platform-core`), completely decoupled from application frameworks.

```
industrial-platform-core/
├── pom.xml                               # Root Parent POM (compiler, checkstyle, lint)
├── platform-bom/                         # Bill of Materials managing unified versions
│   └── pom.xml
│
├── modules/
│   │
│   ├── [MODULE 1: RESOURCE MANAGER]
│   └── resource-manager/                 # Pure Java 17 Micro-kernel (<500KB)
│       ├── api/                          # Unified ResourceClient facade, immutable DTO records
│       ├── domain/
│       │   ├── model/                    # Resource Aggregate Root, ResourceId, SpatialCoordinate
│       │   ├── fsm/                      # PackML (ISA-TR88) & SEMI E10 deterministic state engine
│       │   ├── arbitration/              # Deadlock-free gang arbitration & lease manager
│       │   ├── capability/               # Dynamic contracts, parameter rules & proximity matchmaker
│       │   └── topology/                 # OperationalGraph (PART_OF, FEEDS, INTERLOCKED_WITH)
│       └── application/port/             # SPI Ports: ResourceRepositoryPort, EventPublisherPort
│
│   ├── [MODULE 2: INDUSTRY DEVICE GATEWAY]
│   ├── gateway-api/                      # Unified Protocol-Agnostic Gateway SPI
│   │   ├── DeviceGateway.java            # Standard interface: connect, disconnect, read, write, subscribe
│   │   ├── TagAddress.java               # Protocol-agnostic address abstraction
│   │   ├── DataPoint.java                # Immutable record: value, QualityStatus, timestamp
│   │   ├── QualityStatus.java            # GOOD, BAD, UNCERTAIN, COMM_FAILURE
│   │   └── SubscriptionListener.java     # Push callback for tag change events
│   │
│   ├── gateway-opcua/                    # OPC UA Driver Engine
│   │   ├── client/                       # Eclipse Milo 0.6.14 client integration
│   │   ├── subscription/                 # MonitoredItem server-push subscription engine
│   │   ├── batch/                        # High-throughput multi-node read/write batcher
│   │   └── simulation/                   # Embedded virtual S7-1500 PLC server for testing
│   │
│   └── gateway-modbus/                   # Modbus TCP & RTU Driver Engine
│       ├── client/                       # High-performance non-blocking Modbus TCP client
│       ├── codec/                        # Register/Coil codec (Word swapping, IEEE 754 float, Int32)
│       ├── poller/                       # Virtual-thread cyclic batch poller for change detection
│       └── connection/                   # Connection pool, socket watchdog & auto-reconnect
│
└── adapters/
    └── wo-spring-starter/                # Spring Boot AutoConfiguration for Warehouse Orchestrator
```

---

## 2. Module 1: Resource Manager Implementation

The foundation exists in `reseach/resource_manager`. This phase finalizes production hardening and integration SPIs.

### Deliverables & Key Components
1. **Deterministic State Machine (PackML TR88 / SEMI E10)**:
   - Sealed interfaces guaranteeing compile-time exhaustive pattern matching.
   - Enforces valid industrial state transitions (`STOPPED` -> `STARTING` -> `EXECUTE` -> `HOLDING` -> `HELD`).
2. **Deadlock-Free Gang Arbitration Engine**:
   - Canonical `ResourceId` sorting prior to 2-phase atomic locking eliminates Coffman circular waits.
   - Timed leases with automatic rollback on timeout or allocation failure.
3. **Hexagonal Persistence & Event Ports**:
   - `ResourceRepositoryPort`: Enables pluggable persistence (In-memory, PostgreSQL, or Redis).
   - `EventPublisherPort`: Emits CloudEvents-compliant `ResourceCreatedEvent` and `ResourceStateChangedEvent`.
4. **Code Quality Metric**:
   - Every file strictly $\le 250$ lines of code, verified by automated unit tests.

---

## 3. Module 2: Industry Device Gateway

### 3.1 Unified Gateway SPI (`gateway-api`)
Provides a single interface so downstream services (`wcs-service`, `asrs-wcs-service`) write driver-agnostic logic:

```java
public interface DeviceGateway extends AutoCloseable {
    CompletableFuture<Void> connect();
    CompletableFuture<Void> disconnect();
    boolean isConnected();
    
    CompletableFuture<DataPoint> read(TagAddress tag);
    CompletableFuture<Map<TagAddress, DataPoint>> readBatch(Set<TagAddress> tags);
    
    CompletableFuture<Void> write(TagAddress tag, Object value);
    CompletableFuture<Void> writeBatch(Map<TagAddress, Object> values);
    
    SubscriptionHandle subscribe(TagAddress tag, SubscriptionListener listener);
}
```

---

### 3.2 OPC UA Gateway (`gateway-opcua`)
Built on Eclipse Milo 0.6.14.

| Feature | Description |
| :--- | :--- |
| **Security Profiles** | `None`, `Basic256Sha256`, `Aes128_Sha256_RsaOaep`. Supports anonymous, password, and X.509 certificates. |
| **Subscription Engine** | MonitoredItem server-driven change notifications with deadband filtering and sampling intervals down to 10ms. |
| **Address Space Browser** | Dynamic traversal and discovery of PLC node trees. |
| **Built-in Simulator** | Virtual Siemens S7-1500 namespace for automated integration tests without physical PLCs. |

---

### 3.3 Modbus TCP / RTU Gateway (`gateway-modbus`)
Designed for conveyor photo-eyes, divert solenoids, barcode readers, and legacy PLCs.

| Function Code | Modbus Function | Usage |
| :--- | :--- | :--- |
| **FC01 & FC02** | Read Coils & Discrete Inputs | Digital sensor states (photocells, E-stop circuit). |
| **FC03 & FC04** | Read Holding & Input Registers | Analog metrics (conveyor speed, motor current, temperature). |
| **FC05 & FC06** | Write Single Coil & Register | Actuate divert arm, set motor speed setpoint. |
| **FC15 & FC16** | Write Multiple Coils & Registers | Atomic command parameter blocks. |

#### Special Modbus Capabilities:
- **Virtual Thread Polling Engine**: Modbus lacks native pub/sub. A virtual-thread background poller reads register blocks and fires `SubscriptionListener` only when values change.
- **Data Type Codec**: Transparent encoding/decoding of 16-bit register words into `INT16`, `UINT16`, `INT32` (word swapped), `FLOAT32` (IEEE 754), and ASCII strings.

---

## 4. Integration with Warehouse Orchestrator (WO)

1. **`common/common-resource`**:
   - Declares dependency on `org.platform:resource-manager`.
   - Exposes `ResourceClient` Spring bean to `wes-service`, `wcs-service`, and `fleet-service`.
2. **`common/common-industrial`**:
   - Declares dependencies on `gateway-opcua` and `gateway-modbus`.
   - Provides a `DeviceGatewayFactory` that instantiates either OPC UA or Modbus gateways based on device connection URLs.
3. **Turnkey Client Deployment**:
   - Standard Maven package (`mvn clean package`) packages all compiled libraries directly inside the final Spring Boot microservice fat JARs (`BOOT-INF/lib/`).

---

## 5. Phased Roadmap

| Phase | Milestone | Duration | Key Outcome |
| :---: | :--- | :---: | :--- |
| **1** | Multi-Module Repo Setup & BOM | Week 1 | `platform-bom`, parent POM, and automated build pipeline. |
| **2** | Resource Manager Hardening | Week 1–2 | Finalize SPI ports, lease expiry watchdog, and event publisher. |
| **3** | Gateway API & OPC UA Adapter | Week 2–3 | Standard `DeviceGateway` SPI and Eclipse Milo adapter integration. |
| **4** | Modbus TCP Engine & Codecs | Week 3–4 | Non-blocking Modbus client, register codecs, and virtual-thread poller. |
| **5** | WO Starter & End-to-End Test | Week 5 | Integration into `wes-service` and `wcs-service` with hardware simulator. |
