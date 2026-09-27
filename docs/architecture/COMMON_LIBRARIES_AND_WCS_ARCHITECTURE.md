# Common Libraries & WCS Subsystem Architecture

This document defines the structural blueprint for sharing upstream core libraries (such as `resource-manager` and `OPC-UA`) across the **Warehouse Orchestrator (WO)** platform, with special emphasis on how the **WCS (Warehouse Control System) family of microservices** interact with them.

---

## 1. System Block Diagram

```
+===================================================================================================+
|                                    UPSTREAM RESEARCH ENGINE                                       |
|                                                                                                   |
|   reseach/resource_manager (Pure Java 17 Micro-kernel)                                            |
|   • PackML / SEMI E10 Finite State Machines                                                       |
|   • Deadlock-Free Deterministic Gang Arbitration                                                  |
|   • 3D Coordinates & Capability Matchmaking                                                       |
|   • Graph Topology (PART_OF, FEEDS, INTERLOCKED_WITH)                                             |
+===================================================================================================+
                                                  │
                                                  │ [Maven: org.platform:resource-manager-core]
                                                  ▼
+===================================================================================================+
|                     Warehouse_orchestrator / common / (SHARED LIBRARIES)                          |
|                                                                                                   |
|  +------------------------+  +------------------------+  +-------------------------------------+  |
|  |    common-resource     |  |   common-industrial    |  |       common-software-client        |  |
|  |                        |  |                        |  |                                     |  |
|  | • Spring AutoConfig    |  | • Eclipse Milo OPC-UA  |  | • Dynamic REST Engine & OAuth2      |  |
|  | • ResourceClient Bean  |  | • Siemens S7 / PLC     |  | • Dynamic Payload Mapping           |  |
|  | • Event Publisher Port |  | • Industrial Telemetry |  | • External Auth & Tokens            |  |
|  +------------------------+  +------------------------+  +-------------------------------------+  |
+===================================================================================================+
        │              │                 │                                   │
        │              │                 │                                   │
        ▼              ▼                 ▼                                   ▼
+===================================================================================================+
|                       WAREHOUSE ORCHESTRATOR MICROSERVICES (services/)                            |
|                                                                                                   |
|  +─────────────────────────────────────────────────────────────────────────────────────────────+  |
|  |                                  wes-service (Orchestrator)                                 |  |
|  |  • Uses: common-resource + common-software-client                                           |  |
|  |  • Role: Wave Sequencing, Orders, and Gang Arbitration (Cranes + Conveyors + AGVs)          |  |
|  +─────────────────────────────────────────────────────────────────────────────────────────────+  |
|                                                  │                                                |
|                     ┌────────────────────────────┼────────────────────────────┐                   |
|                     │ (gRPC Leases & Moves)      │ (gRPC Divert Paths)        │ (gRPC Transports) |
|                     ▼                            ▼                            ▼                   |
|  +─────────────────────────────+  +─────────────────────────────+  +───────────────────────────+  |
|  |       asrs-wcs-service      |  |         wcs-service         |  |       fleet-service       |  |
|  |                             |  |                             |  |                           |  |
|  | • Uses:                     |  | • Uses:                     |  | • Uses:                   |  |
|  |   common-resource           |  |   common-resource           |  |   common-resource         |  |
|  |   common-industrial         |  |   common-industrial         |  |                           |  |
|  |                             |  |                             |  |                           |  |
|  | • Domain:                   |  | • Domain:                   |  | • Domain:                 |  |
|  |   High-bay Stacker Cranes   |  |   Conveyor Lines & Diverts  |  |   Mobile AGVs & AMRs      |  |
|  |   Aisle Shuttles            |  |   Turntables & Scanners     |  |   Carts & Lifters         |  |
|  |                             |  |                             |  |                           |  |
|  | • Key Mechanics:            |  | • Key Mechanics:            |  | • Key Mechanics:          |  |
|  |   3D Coordinate Positions   |  |   Topology Graph & Interlock|  |   Continuous Kinematic    |  |
|  |   PackML EXECUTE/HOLD FSM   |  |   Cascading E-Stop Halts    |  |   Spatial Tracking (X,Y)  |  |
|  +─────────────────────────────+  +─────────────────────────────+  +───────────────────────────+  |
+===================================================================================================+
                  │                                │                               │
                  │ (OPC-UA / S7)                  │ (OPC-UA / Fieldbus)           │ (VDA 5050 / MQTT)
                  ▼                                ▼                               ▼
+===================================================================================================+
|                               SHOP FLOOR HARDWARE & AUTOMATION                                    |
|                                                                                                   |
|  [ ASRS Stacker Cranes & Racks ]    [ Roller Conveyors & Diverters ]      [ Mobile Robot Fleet ]  |
+===================================================================================================+
```

---

## 2. Common Library Responsibilities

| Shared Library Module | Consuming Microservices | Core Purpose & Capabilities |
| :--- | :--- | :--- |
| **`common-resource`** | `wes-service`<br>`asrs-wcs-service`<br>`wcs-service`<br>`fleet-service` | Wraps upstream `resource-manager-core`. Supplies PackML FSM, gang arbitration algorithms, 3D spatial models, topology graph, and Spring Boot AutoConfiguration beans (`ResourceClient`). |
| **`common-industrial`** | `asrs-wcs-service`<br>`wcs-service` | Industrial communications layer providing Eclipse Milo OPC-UA client/server engines, Siemens S7 PLC read/write drivers, and handshake sequence managers. |
| **`common-software-client`** | `wes-service`<br>`wms-service` | Enterprise integration layer managing dynamic REST requests, OAuth2 token renewal, JSON/XML mapping engines, and external host endpoints (WMS/ERP). |
| **`common-core` / `grpc`** | All Microservices | Global domain base types, RFC 7807 problem detail exceptions, Protobuf contracts, and gRPC client stubs. |

---

## 3. The "WCS Family" Pattern: Similarities vs Differences

In modern warehouse automation, physical equipment is divided into specialized control domains. The three execution microservices belong to the **WCS Family**:

```
                       WCS FAMILY (ISA-95 Level 2)
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
      asrs-wcs-service         wcs-service           fleet-service
      (Fixed 3D Rail)      (Fixed 2D Network)     (Free-Roaming 2D/3D)
```

### Detailed Subsystem Comparison

| Dimension | `asrs-wcs-service` | `wcs-service` | `fleet-service` |
| :--- | :--- | :--- | :--- |
| **Controlled Machines** | Stacker Cranes, Vertical Lifts, Shuttles. | Roller Conveyors, Turntables, Diverts, Scanners. | AGVs, AMRs, Autonomous Forklifts. |
| **Degrees of Freedom** | 1D/2D/3D constrained to fixed aisle rails. | 1D flow constrained to fixed physical conveyor belts. | Fully autonomous navigation across warehouse floor zones. |
| **Resource Manager Feature** | **3D Rack Coordinates**: Maps $(X, Y, Z)$ to rack aisle, bay, and shelf. | **Operational Graph**: Models `FEEDS` and `INTERLOCKED_WITH` relationships. | **Continuous Spatial Tracking**: Tracks $(X, Y, \text{Yaw})$ and executes proximity matchmaking. |
| **Safety Interlocks** | Aisle safety gates; stops crane if shuttle is not home. | Cascading E-Stops; halting section 5 stops sections 1–4. | Dynamic LIDAR safety zones; halts on obstacle detection. |
| **Physical Protocol** | OPC-UA / Siemens S7 Industrial Ethernet. | OPC-UA / Modbus TCP / IO-Link. | MQTT / WebSockets (VDA 5050 protocol). |

---

## 4. End-to-End Orchestration Workflow (WES Coordination)

When a pallet needs to move from high-bay storage to an outbound shipping dock, the **WES** coordinates all three WCS services using **Gang Arbitration**:

```
[ Step 1: WES Allocation ]
   WES reserves { Crane-01, Conveyor-Infeed-04, AGV-02 } simultaneously
   using `GangArbitrationEngine.allocateGang(...)`.
   -> Eliminates circular wait deadlocks between subsystems.

[ Step 2: ASRS Execution ]
   WES dispatches retrieve command to `asrs-wcs-service`.
   Crane-01 transitions: READY -> EXECUTE -> drops pallet on Conveyor -> READY.

[ Step 3: Conveyor Transfer ]
   `wcs-service` senses pallet on infeed photo-eye.
   Runs pallet along route graph to the AGV pickup spur.

[ Step 4: Fleet Transport ]
   `fleet-service` dispatches AGV-02 to the conveyor pickup spur.
   AGV picks pallet and navigates to the outbound shipping dock.

[ Step 5: Release Lease ]
   WES detects completion and releases the allocation lease.
```

---

## 5. File References

- Upstream Core: `C:\Users\Windows10\Documents\GitHub\reseach\resource_manager`
- Common Industrial Module: `common/common-industrial`
- Common Software Client Module: `common/common-software-client`
- WES Service: `services/wes-service`
- Conveyor WCS Service: `services/wcs-service`
- ASRS Control Service: `services/asrs-wcs-service`
- Fleet AMR Service: `services/fleet-service`
