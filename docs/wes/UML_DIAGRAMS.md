# WES Service UML Architecture & Process Diagrams

This document contains visual UML diagrams for `services/wes-service`, modeled in **Mermaid** for immediate rendering and cross-referenced with production **PlantUML (`.puml`)** source files located in this directory.

---

## 1. Core Domain & Architecture Class Diagram

> **PlantUML Source**: [class_diagram.puml](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/doc/wes/class_diagram.puml)

```mermaid
classDiagram
    direction TB

    class InboundPalletController {
        +validateInboundPallet(request) ResponseEntity~ValidationResult~
        +submitInboundPallet(request) ResponseEntity~InboundExecutionResponse~
        +getTaskById(taskId) ResponseEntity~WesTaskEntity~
        +completeOperation(taskId, seq, request) ResponseEntity~WesTaskEntity~
        +failOperation(taskId, seq, request) ResponseEntity~WesTaskEntity~
    }

    class PalletInventoryController {
        +getAllPallets() ResponseEntity~List~
        +createInboundPallet(request) ResponseEntity~PalletDto~
        +getPalletProcessLogs(id) ResponseEntity~List~
        +recordProcessLog(id, request) ResponseEntity~PalletProcessLogDto~
    }

    class DynamicMappingController {
        +getMappings(resourceId, opType) ResponseEntity~List~
        +createMapping(entity) ResponseEntity~ApiIntegrationMappingEntity~
        +updateMapping(id, entity) ResponseEntity~ApiIntegrationMappingEntity~
        +previewPayload(request) ResponseEntity~Map~
        +testRunDispatch(request) ResponseEntity~Map~
    }

    class PalletValidationCoordinator {
        -List~PalletSubValidator~ subValidators
        +validate(request, context) ValidationResult
    }

    class PalletSubValidator {
        <<interface>>
        +getTier() ValidationTier
        +supports(context) boolean
        +validate(context, result) void
    }

    class ProcessTriggerRouter {
        +routeAndTrigger(context, validationResult) InboundExecutionResponse
    }

    class OperationCollectionResolver {
        +resolveOperations(context, validationResult) List~PlannedOperation~
    }

    class TaskTrackingEngine {
        +createAndStartTask(context, plannedOps) WesTaskEntity
        +completeOperation(taskId, seq, result, loc) WesTaskEntity
        +failOperation(taskId, seq, reason) WesTaskEntity
    }

    class PalletFlowCoordinator {
        -List~PalletFlowStepHandler~ stepHandlers
        +executeFlow(context) boolean
    }

    class DynamicPayloadEngine {
        +findActiveMapping(resourceId, opType) Optional
        +buildPayload(templateJson, context) String
        +buildHeaders(headersJson, context) Map
    }

    class WmsIntegrationSpi {
        <<interface>>
        +preAnnouncePallet(cmd) WmsPreAnnounceResult
        +createOrder(cmd) WmsOrderResult
        +reserveOrder(cmd) WmsReserveResult
        +sendToOutbound(cmd) WmsOutboundResult
    }

    class WmsRestAdapter {
        +preAnnouncePallet(cmd) WmsPreAnnounceResult
        +createOrder(cmd) WmsOrderResult
        +reserveOrder(cmd) WmsReserveResult
        +sendToOutbound(cmd) WmsOutboundResult
    }

    class PalletEntity {
        +UUID id
        +String palletLpn
        +String loadType
        +String status
        +String currentLocation
        +BigDecimal actualWeightKg
        +String customAttributes
        +List~PalletItemEntity~ items
    }

    class WesTaskEntity {
        +UUID id
        +String taskNumber
        +String taskType
        +String palletLpn
        +String status
        +int currentOperationSeq
        +List~TaskOperationEntity~ operations
    }

    class TaskOperationEntity {
        +UUID id
        +int sequence
        +String operationType
        +String handlerType
        +String status
        +String inputPayload
        +String outputResult
    }

    InboundPalletController --> PalletValidationCoordinator
    InboundPalletController --> ProcessTriggerRouter
    ProcessTriggerRouter --> OperationCollectionResolver
    ProcessTriggerRouter --> TaskTrackingEngine
    ProcessTriggerRouter --> PalletFlowCoordinator
    PalletValidationCoordinator o-- PalletSubValidator
    WmsRestAdapter ..|> WmsIntegrationSpi
    WmsRestAdapter --> DynamicPayloadEngine
    PalletEntity "1" *-- "0..*" PalletItemEntity
    WesTaskEntity "1" *-- "1..*" TaskOperationEntity
```

---

## 2. Component Architecture (ISA-95 & Hexagonal)

> **PlantUML Source**: [component_diagram.puml](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/doc/wes/component_diagram.puml)

```mermaid
graph TB
    subgraph L4 ["Level 4: Enterprise & Warehouse Management System"]
        ExtWMS["Third-Party WMS (SAP EWM / Manhattan / Logiqs)"]
        ERP["Enterprise ERP (SAP S/4HANA / Oracle NetSuite)"]
    end

    subgraph L3 ["Level 3: Warehouse Execution System (wes-service)"]
        subgraph PrimaryAdapters ["Driving Adapters (Inbound / API)"]
            InboundAPI["InboundPalletController (/pallets/inbound/submit)"]
            MappingAPI["DynamicMappingController (/mappings)"]
            FormsAPI["WmsFormsController (/wms)"]
            InvAPI["PalletInventoryController (/pallets)"]
            GrpcServer["gRPC MasterData Server"]
        end

        subgraph CoreDomain ["Core Domain & Execution Engines"]
            ValEngine["PalletValidationCoordinator (3-Tier Engine)"]
            Router["ProcessTriggerRouter"]
            Resolver["OperationCollectionResolver"]
            TaskEngine["TaskTrackingEngine (State Machine)"]
            FlowEngine["PalletFlowCoordinator (Pipeline Pipeline)"]
            DynEngine["DynamicPayloadEngine (AST Evaluator)"]
            MasterData["MasterDataService"]
        end

        subgraph DrivenAdapters ["Driven Adapters (Outbound / SPI)"]
            SPI["WmsIntegrationSpi (Hexagonal Port)"]
            RestAdapter["WmsRestAdapter (Hexagonal Adapter)"]
            TokenMgr["WmsTokenManager (OAuth2 Cache)"]
            AuditLog["WmsHttpLoggingInterceptor"]
            JPA["Spring Data JPA Repositories"]
        end

        subgraph Database ["PostgreSQL (Schema: wes)"]
            PalletTbl["wes.pallet & wes.pallet_item"]
            TaskTbl["wes.wes_task & wes.task_operation"]
            AuditTbl["wes.pallet_process_log & wes.wms_transaction_log"]
            MappingTbl["wes.api_integration_mapping & wes.resource"]
        end
    end

    subgraph L2 ["Level 2: Warehouse Control System (WCS) & Automation"]
        PLC["Conveyor & Diverter PLCs"]
        ASRS["High-Bay AS/RS Cranes"]
        Scales["In-Motion Scales & Dimensioners"]
        Handhelds["Operator RF Scanners & Forklift Terminals"]
    end

    Handhelds --> InboundAPI
    Scales --> InboundAPI
    InboundAPI --> ValEngine
    InboundAPI --> Router
    Router --> Resolver
    Router --> TaskEngine
    Router --> FlowEngine
    FlowEngine --> SPI
    SPI --> RestAdapter
    RestAdapter --> DynEngine
    RestAdapter --> TokenMgr
    RestAdapter --> AuditLog
    AuditLog --> ExtWMS

    TaskEngine --> JPA
    Router --> JPA
    MasterData --> JPA
    JPA --> Database

    TaskEngine -.-> PLC
    PLC -.-> TaskEngine
```

---

## 3. Inbound Ingestion & Validation Execution Sequence

> **PlantUML Source**: [sequence_diagram_inbound.puml](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/doc/wes/sequence_diagram_inbound.puml)

```mermaid
sequenceDiagram
    autonumber
    actor Terminal as Operator / RF Scanner
    participant Ctrl as InboundPalletController
    participant Val as PalletValidationCoordinator
    participant Router as ProcessTriggerRouter
    participant OpRes as OperationCollectionResolver
    participant TaskEng as TaskTrackingEngine
    participant Flow as PalletFlowCoordinator
    participant Adapter as WmsRestAdapter
    participant ExtWMS as Third-Party WMS
    participant DB as PostgreSQL (wes)

    Terminal->>Ctrl: POST /api/v1/wes/pallets/inbound/submit (LPN, Item, PalletType, Weight)
    activate Ctrl

    Ctrl->>Val: validate(request, context)
    activate Val
    Note over Val: Tier 1: Identity & Duplicate LPN Check
    Note over Val: Tier 2: Weight & Dimensional Rating
    Note over Val: Tier 3: Allergen, Expiry & Lot Policy
    Val-->>Ctrl: ValidationResult (ACCEPTED / WARNING / REJECT)
    deactivate Val

    alt If Rejected
        Ctrl-->>Terminal: HTTP 422 Unprocessable Entity (Rejection List)
    else If Accepted / Warnings
        Ctrl->>Router: routeAndTrigger(context, validationResult)
        activate Router
        Router->>DB: INSERT wes.pallet & wes.pallet_item
        Router->>OpRes: resolveOperations(context, validationResult)
        OpRes-->>Router: List of PlannedOperations (Weigh -> Bin -> Transport -> Confirm)
        Router->>TaskEng: createAndStartTask(context, plannedOps)
        TaskEng->>DB: INSERT wes.wes_task & wes.task_operation
        TaskEng-->>Router: WesTaskEntity (IN_PROGRESS)

        opt Cross-Dock or Outbound Release Flow
            Router->>Flow: executeFlow(palletFlowContext)
            activate Flow
            Flow->>Adapter: preAnnouncePallet() -> createOrder() -> reserveOrder() -> sendToOutbound()
            Adapter->>ExtWMS: HTTP REST JSON Dispatches
            ExtWMS-->>Adapter: HTTP 200 Confirmations
            Adapter-->>Flow: Success
            deactivate Flow
        end

        Router-->>Ctrl: InboundExecutionResponse
        deactivate Router
        Ctrl-->>Terminal: HTTP 201 Created (taskNumber, palletLpn, warnings)
    end
    deactivate Ctrl
```

---

## 4. Pallet and Task Life-Cycle State Machine

> **PlantUML Source**: [state_diagram_pallet_task.puml](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/doc/wes/state_diagram_pallet_task.puml)

```mermaid
stateDiagram-v2
    [*] --> STAGED: Pallet Arrives at Staging Area
    STAGED --> RECEIVED: Validation Passed
    STAGED --> RECEIVED_WARNING: Tolerable Policy Warning
    STAGED --> REJECTED: Hard Rejection (Overweight, Expired, Unknown SKU)
    REJECTED --> [*]

    RECEIVED --> IN_TRANSIT: Transport Assigned (Conveyor / Forklift)
    RECEIVED_WARNING --> IN_TRANSIT: Transport Assigned

    state "In-Transit QA Gates" as QAGates {
        IN_TRANSIT --> QA_HOLD: Allergen / Temperature Flag
        QA_HOLD --> IN_TRANSIT: QA Cleared
        QA_HOLD --> REJECTED: QA Disposed
    }

    IN_TRANSIT --> STORED: AS/RS Putaway Confirmed in Bin
    STORED --> ALLOCATED: Outbound Order Reservation
    ALLOCATED --> PICKED: Pallet Retrieved from Rack
    PICKED --> SHIPPED: Truck Loaded & Gate Cleared
    SHIPPED --> [*]
```

---

## 5. Dynamic Payload & Mapping Engine Sequence

> **PlantUML Source**: [dynamic_mapping_engine.puml](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/doc/wes/dynamic_mapping_engine.puml)

```mermaid
sequenceDiagram
    autonumber
    participant Adapter as WmsRestAdapter
    participant DynEngine as DynamicPayloadEngine
    participant Cache as ConcurrentHashMap Cache
    participant Jackson as Jackson ObjectMapper (AST)
    participant Repo as ApiIntegrationMappingRepository

    Adapter->>DynEngine: findActiveMapping(resourceId, operationType)
    DynEngine->>Repo: findByTargetResourceIdAndOperationTypeAndActiveTrue()
    Repo-->>DynEngine: ApiIntegrationMappingEntity
    DynEngine-->>Adapter: Optional mapping

    Adapter->>DynEngine: buildPayload(templateJson, contextMap)
    activate DynEngine

    DynEngine->>Cache: get(templateHash)
    alt Cache Miss
        DynEngine->>Jackson: readTree(templateJson)
        Jackson-->>DynEngine: parsed AST (JsonNode)
        DynEngine->>Cache: put(templateHash, AST)
    else Cache Hit
        Cache-->>DynEngine: cached AST
    end

    DynEngine->>Jackson: valueToTree(contextMap)
    Jackson-->>DynEngine: contextNode (JsonNode)

    Note over DynEngine: Recursively evaluate AST nodes:<br/>1. {{ pallet.actualWeightKg }} -> primitive Numeric<br/>2. "LPN: {{ pallet.palletLpn }}" -> String interpolation<br/>3. {{ fn.now }}, {{ fn.uuid }} -> System functions

    DynEngine->>Jackson: writeValueAsString(evaluatedNode)
    Jackson-->>DynEngine: resolvedJsonString
    DynEngine-->>Adapter: Return final JSON payload
    deactivate DynEngine
```
