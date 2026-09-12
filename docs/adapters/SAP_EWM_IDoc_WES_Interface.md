# SAP EWM IDoc ↔ WES Interface: Flow-Based Orchestration

> **Status**: DRAFT — Pending design decisions
> **Created**: 2026-09-10
> **Owner**: Architecture Team

---

## The Real Architecture

```
                                    ┌─────────────────────────────────────────┐
                                    │              WES SERVICE                │
                                    │                                        │
┌───────────┐    IDocs (XML/HTTP)   │  ┌──────────┐    ┌────────────────┐   │
│           │──────────────────────►│  │  IDoc    │    │  Flow Router   │   │
│  SAP EWM  │                       │  │  Gateway │───►│  (Layout-Based)│   │
│  (WMS)    │◄──────────────────────│  │  Parser  │    └───────┬────────┘   │
│           │    Confirmation IDocs  │  └──────────┘            │            │
└───────────┘                       │                    ┌──────┴──────┐     │
                                    │                    │             │     │
                                    │              ┌─────▼────┐ ┌─────▼────┐│
                                    │              │ MANUAL   │ │ CONVEYOR ││
                                    │              │ FLOW     │ │ FLOW     ││
                                    │              │          │ │          ││
                                    │              │ Direct   │ │ WES→WCS  ││
                                    │              │ Loading  │ │ handoff  ││
                                    │              └──────────┘ └─────┬────┘│
                                    └─────────────────────────────────┼─────┘
                                                                      │
                                                                      ▼
                                                               ┌──────────┐
                                                               │   WCS    │
                                                               │ Conveyor │
                                                               │ Control  │
                                                               └────┬─────┘
                                                                    │
                                                                    ▼ Completion
                                                               Back to WES
                                                                    │
                                                                    ▼
                                                            Confirm to SAP EWM
```

**The flow:**

1. **SAP EWM sends IDocs** → Transfer orders, deliveries, material master
2. **WES IDoc Gateway** receives and parses them into normalized internal commands
3. **Flow Router** inspects the warehouse layout config and routes to the right execution path
4. **Execution paths** run independently:
   - **Manual Flow** → Direct worker instructions, WES confirms back to SAP
   - **Conveyor Flow** → WES hands off to WCS, WCS executes, WCS reports completion to WES, WES confirms back to SAP

---

## Layer 1: IDoc Gateway (Receiver + Parser)

SAP IDocs arrive as XML over HTTP (ALE/RFC) or via a middleware queue. The gateway receives, validates, and normalizes them.

### Relevant SAP IDoc Types

| IDoc Type    | SAP Message Type        | What it carries                             | WES action                     |
| ------------ | ----------------------- | ------------------------------------------- | ------------------------------ |
| `WMTORD`   | Transfer Order          | Move pallet A→B (putaway, pick, replenish) | Route to flow engine           |
| `DELVRY06` | `DESADV` / `WHSCON` | Inbound delivery / ASN                      | Create pallet, start receiving |
| `DELVRY06` | `SHPCON`              | Outbound shipment confirmation              | Trigger shipping flow          |
| `MATMAS05` | `MATMAS`              | Material master sync                        | Update`wes.item_master`      |
| `WMCATO`   | Confirmation            | WES sends this BACK to SAP                  | Confirm execution              |

### IdocGatewayController.java

Path: `wes-service/.../api/controller/IdocGatewayController.java`

```java
@RestController
@RequestMapping("/api/v1/wes/idoc")
@RequiredArgsConstructor
@Slf4j
public class IdocGatewayController {

    private final IdocParserService idocParser;
    private final FlowOrchestrator flowOrchestrator;

    /**
     * SAP EWM posts IDocs here (XML payload).
     * Middleware (SAP PI/PO, CPI, or MuleSoft) typically calls this.
     */
    @PostMapping(consumes = {MediaType.APPLICATION_XML_VALUE, MediaType.APPLICATION_JSON_VALUE})
    public ResponseEntity<IdocAcknowledgement> receiveIdoc(@RequestBody String idocPayload) {
      
        // 1. Parse raw IDoc → normalized command
        WesCommand command = idocParser.parse(idocPayload);
      
        // 2. Persist to inbound queue for reliability
        idocParser.persistToInboundQueue(command);
      
        // 3. Route to the right flow
        flowOrchestrator.execute(command);
      
        // 4. Acknowledge receipt to SAP
        return ResponseEntity.ok(IdocAcknowledgement.success(command.getIdocNumber()));
    }

    /**
     * Alternative: batch IDoc reception (SAP sometimes sends multiple IDocs)
     */
    @PostMapping("/batch")
    public ResponseEntity<List<IdocAcknowledgement>> receiveIdocBatch(
            @RequestBody List<String> idocPayloads) {
        // Parse and queue each
    }
}
```

### IdocParserService.java

Path: `wes-service/.../business/service/IdocParserService.java`

Translates SAP IDoc XML into normalized WES commands:

```java
@Service
@Slf4j
public class IdocParserService {

    /**
     * Parse any IDoc type into a normalized WesCommand.
     * Detects IDoc type from the EDIDC control record.
     */
    public WesCommand parse(String rawIdoc) {
        IdocType type = detectIdocType(rawIdoc);
      
        return switch (type) {
            case WMTORD  -> parseTransferOrder(rawIdoc);    // Putaway / Pick / Replenish
            case DELVRY  -> parseDelivery(rawIdoc);          // Inbound ASN or Outbound ship
            case MATMAS  -> parseMaterialMaster(rawIdoc);    // Item master sync
            default      -> throw new UnsupportedIdocException(type);
        };
    }

    private WesCommand parseTransferOrder(String rawIdoc) {
        // Extract: source bin, destination bin, material, quantity, HU (pallet LPN)
        return WesCommand.builder()
                .commandType(CommandType.TRANSFER_ORDER)
                .idocNumber("...")
                .palletLpn("...")
                .sourceBin("...")
                .destinationBin("...")
                .itemCode("...")
                .quantity(...)
                .build();
    }
}
```

### Normalized Command Model

Path: `wes-service/.../business/model/`

```java
/** Vendor-neutral internal command — same whether it came from SAP, Manhattan, or REST */
@Data @Builder
public class WesCommand {
    private String idocNumber;             // Source reference (SAP IDoc number)
    private String externalReference;      // External doc ID
    private CommandType commandType;       // TRANSFER_ORDER, INBOUND_DELIVERY, MATERIAL_SYNC
  
    // Pallet context
    private String palletLpn;
    private String sourceBin;              // Where the pallet is now
    private String destinationBin;         // Where it should go
  
    // Material context
    private String itemCode;
    private String skuCode;
    private BigDecimal quantity;
  
    // Routing metadata (populated by Flow Router)
    private FlowType resolvedFlowType;     // MANUAL, CONVEYOR, ASRS
    private String resolvedZone;
}

public enum CommandType {
    TRANSFER_ORDER,       // Move pallet A → B
    INBOUND_DELIVERY,     // Receive incoming pallet
    OUTBOUND_SHIPMENT,    // Ship pallet out
    MATERIAL_SYNC,        // Update master data
    PUTAWAY,              // Store pallet in rack
    PICK                  // Retrieve pallet from rack
}

public enum FlowType {
    MANUAL_DIRECT,        // Workers load/unload directly (no automation)
    CONVEYOR_WCS,         // Conveyor system controlled by WCS
    ASRS_CRANE,           // Automated Storage/Retrieval (crane-based)
    MIXED                 // Combination (e.g., conveyor to staging, then manual to truck)
}
```

---

## Layer 2: Flow Router (Layout-Based Decision Engine)

The key intelligence: **inspecting the warehouse layout** to decide HOW to execute a command.

### FlowOrchestrator.java

Path: `wes-service/.../business/service/FlowOrchestrator.java`

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class FlowOrchestrator {

    private final FlowRouteResolver routeResolver;
    private final ManualFlowExecutor manualFlowExecutor;
    private final ConveyorFlowExecutor conveyorFlowExecutor;
    private final AsrsFlowExecutor asrsFlowExecutor;
    private final IdocConfirmationService confirmationService;

    /**
     * Execute a WES command by routing it to the correct flow
     * based on warehouse layout configuration.
     */
    @Transactional
    public void execute(WesCommand command) {
      
        // 1. Determine which flow to use based on layout
        FlowType flowType = routeResolver.resolveFlow(command);
        command.setResolvedFlowType(flowType);
      
        log.info("IDoc {} → Command {} → Flow: {}",
                command.getIdocNumber(), command.getCommandType(), flowType);
      
        // 2. Dispatch to the right executor
        FlowResult result = switch (flowType) {
            case MANUAL_DIRECT -> manualFlowExecutor.execute(command);
            case CONVEYOR_WCS  -> conveyorFlowExecutor.execute(command);
            case ASRS_CRANE    -> asrsFlowExecutor.execute(command);
            case MIXED         -> executeMixedFlow(command);
        };
      
        // 3. Send confirmation IDoc back to SAP EWM
        if (result.isCompleted()) {
            confirmationService.sendConfirmation(command, result);
        }
        // For async flows (conveyor/ASRS), confirmation is sent when WCS reports completion
    }
}
```

### FlowRouteResolver.java

Path: `wes-service/.../business/service/FlowRouteResolver.java`

```java
@Service
@RequiredArgsConstructor
public class FlowRouteResolver {

    private final LayoutConfigRepository layoutConfigRepo;

    /**
     * Determine execution flow type based on:
     * - Source zone / destination zone capabilities
     * - Whether the path has conveyor infrastructure
     * - Manual override flags
     */
    public FlowType resolveFlow(WesCommand command) {
      
        // Look up zone capabilities from layout config
        ZoneConfig sourceZone = layoutConfigRepo.findByBinCode(command.getSourceBin());
        ZoneConfig destZone = layoutConfigRepo.findByBinCode(command.getDestinationBin());
      
        // Decision logic
        if (destZone.hasConveyor() && sourceZone.hasConveyor()) {
            return FlowType.CONVEYOR_WCS;
        }
        if (destZone.isAsrs()) {
            return FlowType.ASRS_CRANE;
        }
        if (destZone.isManualOnly() || sourceZone.isManualOnly()) {
            return FlowType.MANUAL_DIRECT;
        }
      
        // Mixed: e.g., conveyor to staging area, then manual to truck
        if (sourceZone.hasConveyor() && destZone.isManualOnly()) {
            return FlowType.MIXED;
        }
      
        return FlowType.MANUAL_DIRECT; // Safe default
    }
}
```

### Layout Configuration Table

Migration: `wes-service/src/main/resources/db/migration/V6__idoc_gateway_and_flow_routing.sql`

```sql
-- ============================================================================
-- WAREHOUSE LAYOUT CONFIGURATION (Zone capabilities for flow routing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wes.zone_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_code VARCHAR(30) NOT NULL UNIQUE,        -- 'RECEIVING', 'COLD_STORAGE', 'SHIPPING_DOCK'
    zone_name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(30) NOT NULL,               -- 'STORAGE', 'STAGING', 'DOCK', 'PRODUCTION'
  
    -- Equipment capabilities (determines flow routing)
    has_conveyor BOOLEAN NOT NULL DEFAULT FALSE,
    has_asrs BOOLEAN NOT NULL DEFAULT FALSE,
    is_manual_only BOOLEAN NOT NULL DEFAULT FALSE,
  
    -- Associated WCS identifiers (if automated)
    wcs_conveyor_id VARCHAR(50),                  -- e.g., 'CONV-LINE-01'
    wcs_crane_id VARCHAR(50),                     -- e.g., 'ASRS-CRANE-A'
  
    -- Bin prefix pattern (to match bins to zones)
    bin_prefix VARCHAR(20) NOT NULL,              -- e.g., 'A-' for Aisle A, 'STG-' for staging
  
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INBOUND IDOC QUEUE (Reliable processing with retry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wes.idoc_inbound_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idoc_number VARCHAR(50) NOT NULL,             -- SAP IDoc document number
    idoc_type VARCHAR(30) NOT NULL,               -- 'WMTORD', 'DELVRY', 'MATMAS'
    message_type VARCHAR(30) NOT NULL,            -- 'TRANSFER_ORDER', 'INBOUND_DELIVERY'
    raw_payload TEXT NOT NULL,                     -- Original IDoc XML
  
    -- Normalized command (parsed from IDoc)
    command_type VARCHAR(30) NOT NULL,            -- WES internal command type
    pallet_lpn VARCHAR(60),
    source_bin VARCHAR(50),
    destination_bin VARCHAR(50),
    resolved_flow VARCHAR(30),                    -- 'MANUAL_DIRECT', 'CONVEYOR_WCS', 'ASRS_CRANE'
  
    -- Processing state
    status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED', -- 'RECEIVED','PROCESSING','COMPLETED','FAILED'
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
  
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================================================
-- OUTBOUND IDOC LOG (Confirmations sent back to SAP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wes.idoc_outbound_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idoc_number VARCHAR(50),                      -- Confirmation IDoc number
    original_idoc_number VARCHAR(50) NOT NULL,    -- Reference to the inbound IDoc
    idoc_type VARCHAR(30) NOT NULL DEFAULT 'WMCATO',
  
    -- Confirmation details
    confirmation_status VARCHAR(20) NOT NULL,     -- 'COMPLETED', 'PARTIAL', 'FAILED'
    pallet_lpn VARCHAR(60),
    final_location VARCHAR(100),
  
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'ACKNOWLEDGED'
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default zone configuration
INSERT INTO wes.zone_config (zone_code, zone_name, zone_type, has_conveyor, has_asrs, is_manual_only, bin_prefix)
VALUES
    ('RECEIVING',     'Receiving Dock',    'DOCK',    FALSE, FALSE, TRUE,  'RCV-'),
    ('STAGING_IN',    'Inbound Staging',   'STAGING', TRUE,  FALSE, FALSE, 'STG-IN-'),
    ('COLD_STORAGE',  'Cold Storage ASRS', 'STORAGE', TRUE,  TRUE,  FALSE, 'COLD-'),
    ('AMBIENT',       'Ambient Storage',   'STORAGE', TRUE,  FALSE, FALSE, 'AMB-'),
    ('MANUAL_RACK',   'Manual Rack Area',  'STORAGE', FALSE, FALSE, TRUE,  'MR-'),
    ('STAGING_OUT',   'Outbound Staging',  'STAGING', TRUE,  FALSE, FALSE, 'STG-OUT-'),
    ('SHIPPING',      'Shipping Dock',     'DOCK',    FALSE, FALSE, TRUE,  'SHIP-')
ON CONFLICT (zone_code) DO NOTHING;
```

---

## Layer 3: Flow Executors

### Flow A: Manual Direct Loading

```
SAP EWM IDoc → WES → Worker instruction → Worker confirms → WES → SAP Confirmation
```

#### ManualFlowExecutor.java

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ManualFlowExecutor {

    private final PalletExecutionService palletService;

    public FlowResult execute(WesCommand command) {
        log.info("MANUAL FLOW: {} pallet {} from {} → {}",
                command.getCommandType(), command.getPalletLpn(),
                command.getSourceBin(), command.getDestinationBin());

        // Update pallet status and location in WES
        // Worker physically moves the pallet and scans at destination
        palletService.recordProcessLog(/*palletId*/, RecordProcessLogRequest.builder()
                .processStage("MANUAL_MOVE")
                .location(command.getDestinationBin())
                .status("COMPLETED")
                .build());

        return FlowResult.completed(command);
        // → Confirmation IDoc sent to SAP immediately
    }
}
```

### Flow B: Conveyor (WCS Handoff)

```
SAP EWM IDoc → WES → WCS (conveyor command) → ... conveyor runs ... →
WCS reports completion → WES → SAP Confirmation
```

This is **asynchronous** — WES hands off to WCS and waits for completion callback.

#### ConveyorFlowExecutor.java

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ConveyorFlowExecutor {

    private final WcsClient wcsClient;
    private final PalletExecutionService palletService;

    public FlowResult execute(WesCommand command) {
        log.info("CONVEYOR FLOW: {} pallet {} via WCS",
                command.getCommandType(), command.getPalletLpn());

        // 1. Send transport command to WCS
        WcsTransportRequest wcsRequest = WcsTransportRequest.builder()
                .palletLpn(command.getPalletLpn())
                .sourcePoint(command.getSourceBin())
                .destinationPoint(command.getDestinationBin())
                .wesCommandId(command.getIdocNumber())  // For callback correlation
                .build();

        wcsClient.sendTransportOrder(wcsRequest);

        // 2. Mark as IN_PROGRESS — WCS will call back when done
        palletService.recordProcessLog(/*palletId*/, RecordProcessLogRequest.builder()
                .processStage("CONVEYOR")
                .status("IN_TRANSIT")
                .build());

        return FlowResult.inProgress(command);
        // → SAP confirmation is NOT sent yet — waits for WCS completion callback
    }
}
```

#### WcsCompletionListener.java

Path: `wes-service/.../infrastructure/messaging/listener/WcsCompletionListener.java`

WCS calls back when conveyor transport is done:

```java
@RestController
@RequestMapping("/api/v1/wes/wcs-callback")
@RequiredArgsConstructor
@Slf4j
public class WcsCompletionListener {

    private final FlowCompletionService completionService;

    /**
     * WCS reports that a conveyor transport has finished.
     * WES then:
     * 1. Updates pallet location
     * 2. Sends confirmation IDoc back to SAP EWM
     */
    @PostMapping("/transport-complete")
    public ResponseEntity<Void> onTransportComplete(@RequestBody WcsCompletionEvent event) {
        log.info("WCS completion: pallet {} arrived at {}",
                event.getPalletLpn(), event.getFinalLocation());
      
        completionService.handleWcsCompletion(event);
        // → This triggers SAP confirmation IDoc
      
        return ResponseEntity.ok().build();
    }
}
```

---

## Layer 4: SAP Confirmation (Outbound IDocs)

After any flow completes, WES sends a confirmation IDoc (WMCATO) back to SAP EWM.

#### IdocConfirmationService.java

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class IdocConfirmationService {

    private final SapIdocClient sapClient;
    private final IdocOutboundLogRepository outboundLogRepo;

    /**
     * Send WMCATO confirmation IDoc back to SAP EWM.
     * Called when:
     * - Manual flow completes immediately
     * - WCS reports conveyor completion (async callback)
     */
    public void sendConfirmation(WesCommand originalCommand, FlowResult result) {
      
        String confirmationIdoc = buildWmcatoIdoc(originalCommand, result);
      
        // Persist for audit and retry
        IdocOutboundLogEntity log = IdocOutboundLogEntity.builder()
                .originalIdocNumber(originalCommand.getIdocNumber())
                .idocType("WMCATO")
                .confirmationStatus(result.getStatus())
                .palletLpn(originalCommand.getPalletLpn())
                .finalLocation(result.getFinalLocation())
                .build();
        outboundLogRepo.save(log);
      
        // Send to SAP (via middleware endpoint)
        sapClient.postConfirmationIdoc(confirmationIdoc);
      
        log.info("Sent WMCATO confirmation to SAP for IDoc {}", originalCommand.getIdocNumber());
    }
}
```

---

## Complete Execution Timeline

### Example: Inbound Pallet via Conveyor

```
Time  │ System    │ Action
──────┼───────────┼──────────────────────────────────────────────
T+0   │ SAP EWM   │ Sends WMTORD IDoc: "Move PLT-001 from RCV-01 to COLD-A-03-02"
T+1   │ WES       │ IDoc Gateway receives, parses → WesCommand(TRANSFER_ORDER)
T+2   │ WES       │ FlowRouter checks layout: RCV→COLD has conveyor → CONVEYOR_WCS
T+3   │ WES       │ ConveyorFlowExecutor sends transport order to WCS
T+4   │ WCS       │ Activates conveyor line, pallet moves physically
T+30  │ WCS       │ Pallet arrives at COLD-A-03-02, WCS calls /wcs-callback/transport-complete
T+31  │ WES       │ WcsCompletionListener updates pallet location in DB
T+32  │ WES       │ IdocConfirmationService sends WMCATO back to SAP EWM
T+33  │ SAP EWM   │ Receives confirmation, marks transfer order as completed
```

### Example: Outbound Pallet via Manual Loading

```
Time  │ System    │ Action
──────┼───────────┼──────────────────────────────────────────────
T+0   │ SAP EWM   │ Sends WMTORD IDoc: "Move PLT-099 from AMB-B-05-01 to SHIP-03"
T+1   │ WES       │ IDoc Gateway receives, parses → WesCommand(TRANSFER_ORDER)
T+2   │ WES       │ FlowRouter: AMB has conveyor but SHIP is manual-only → MANUAL_DIRECT
T+3   │ WES       │ ManualFlowExecutor creates worker task / instruction
T+10  │ Worker    │ Scans pallet at SHIP-03 (confirming arrival)
T+11  │ WES       │ Updates pallet location, sends WMCATO confirmation to SAP
```

---

## File Map

### WES Service — New Files

| Category                  | File                                                             | Purpose                                      |
| ------------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| **IDoc Gateway**    | `api/controller/IdocGatewayController.java`                    | Receives IDoc XML from SAP/middleware        |
|                           | `business/service/IdocParserService.java`                      | Parses IDoc XML →`WesCommand`             |
|                           | `infrastructure/client/SapIdocClient.java`                     | Sends confirmation IDocs to SAP              |
| **Flow Engine**     | `business/service/FlowOrchestrator.java`                       | Main dispatch: command → flow               |
|                           | `business/service/FlowRouteResolver.java`                      | Layout-based routing decision                |
|                           | `business/service/FlowCompletionService.java`                  | Handles async flow completion (WCS callback) |
| **Flow Executors**  | `business/impl/ManualFlowExecutor.java`                        | Synchronous manual execution                 |
|                           | `business/impl/ConveyorFlowExecutor.java`                      | Async WCS handoff                            |
|                           | `business/impl/AsrsFlowExecutor.java`                          | ASRS crane handoff                           |
| **WCS Integration** | `infrastructure/client/WcsClient.java`                         | REST/gRPC calls to WCS service               |
|                           | `infrastructure/messaging/listener/WcsCompletionListener.java` | WCS callback endpoint                        |
| **Confirmation**    | `business/service/IdocConfirmationService.java`                | Send WMCATO back to SAP                      |
| **Models**          | `business/model/WesCommand.java`                               | Normalized vendor-neutral command            |
|                           | `business/model/FlowType.java`                                 | Enum: MANUAL, CONVEYOR, ASRS                 |
|                           | `business/model/FlowResult.java`                               | Execution result                             |
|                           | `business/model/CommandType.java`                              | Enum: TRANSFER_ORDER, DELIVERY, etc.         |
| **Data**            | `data/entity/ZoneConfigEntity.java`                            | Zone layout JPA entity                       |
|                           | `data/entity/IdocInboundQueueEntity.java`                      | Inbound IDoc audit                           |
|                           | `data/entity/IdocOutboundLogEntity.java`                       | Outbound confirmation audit                  |
|                           | `data/repository/ZoneConfigRepository.java`                    | Zone queries                                 |
|                           | `data/repository/IdocInboundQueueRepository.java`              |                                              |
|                           | `data/repository/IdocOutboundLogRepository.java`               |                                              |
| **Migration**       | `db/migration/V6__idoc_gateway_and_flow_routing.sql`           | Zone config, IDoc queues                     |
| **DTO**             | `api/dto/IdocAcknowledgement.java`                             | Receipt acknowledgement                      |
|                           | `api/dto/WcsTransportRequest.java`                             | WCS transport command                        |
|                           | `api/dto/WcsCompletionEvent.java`                              | WCS completion callback                      |

---

## Open Design Decisions

### 1. IDoc Transport

How will SAP EWM deliver IDocs to WES?

- **SAP PI/PO or CPI** middleware → HTTP POST to WES (most common)
- **Direct RFC** from SAP (requires JCo connector — more complex)
- **File-based** (IDoc written to shared folder, WES polls)
- **Message queue** (SAP → RabbitMQ/Kafka → WES)

### 2. IDoc Format

Will the IDocs arrive as:

- **Raw SAP IDoc XML** (segments like E1LTORH, E1LTORI)
- **Simplified JSON** via middleware transformation (SAP CPI can convert before sending)
- Recommendation: Have middleware send **simplified JSON** — parsing raw IDoc XML is painful

### 3. How many flow types in Phase 1?

- Just **Manual + Conveyor** (as described)
- Add **ASRS crane** flow too
- Add **Mixed** flow (conveyor to staging, then manual to dock)

### 4. WCS communication protocol

How does WES talk to `wcs-service`?

- REST (simple, existing pattern)
- gRPC (`common-grpc` ready)
- Both (gRPC for transport commands, REST for callbacks)

---

## Revision History

| Date       | Author | Change                                                                 |
| ---------- | ------ | ---------------------------------------------------------------------- |
| 2026-09-10 | —     | Initial draft: IDoc gateway, flow routing, manual & conveyor executors |
