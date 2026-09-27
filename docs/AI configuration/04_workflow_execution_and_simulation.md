# Workflow Execution, Simulation & Observability Guide

The **WES Workflow Engine** orchestrates end-to-end warehouse business logic across multi-step directed acyclic graphs (DAGs). It supports state persistence, asynchronous correlation handshakes, dynamic conditional branching, and a **Virtual Digital Twin Simulation Mode**.

---

## 1. Execution Modes: Real vs Simulation

```
                                Trigger Workflow
                                       |
                                       v
                     +-----------------------------------+
                     | Is Execution Mode == SIMULATION?  |
                     +-----------------------------------+
                               /               \
                       (YES)  /                 \  (NO - REAL)
                             v                   v
              +-----------------------+   +-----------------------+
              | Virtual Digital Twin  |   | Industrial Hardware   |
              | Emulation Engine      |   | Dispatcher            |
              | - Emulates sensors    |   | - OPC UA PLC writes   |
              | - Simulates latencies |   | - AS/RS Crane gRPC    |
              | - Generates barcodes  |   | - AMR Fleet REST/MQTT |
              +-----------------------+   +-----------------------+
```

| Mode | Behavior | Safety & Purpose |
| :--- | :--- | :--- |
| **`REAL`** | Dispatches live commands over industrial protocols (OPC UA, Modbus, gRPC) to shop-floor hardware. | Production 24/7 operations. Requires physical clearance. |
| **`SIMULATION`** | Intercepts hardware nodes and executes virtual digital twin emulation with configurable delays and deterministic outcomes. | Zero-risk pre-flight verification, testing new routing logic, and AI self-correction without shop-floor impact. |

---

## 2. API Endpoints Reference

Base Path: `http://localhost:8086/api/v1/wes/workflows`

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Engine Mode** | `GET` | `/mode` | Returns the global execution mode (`REAL` or `SIMULATION`). |
| | `POST` | `/mode` | Toggles global engine mode between `REAL` and `SIMULATION`. |
| **Definitions** | `GET` | `/definitions` | Lists all workflow DAG definitions. |
| | `GET` | `/definitions/{workflowCode}` | Retrieves a single workflow DAG definition by code. |
| | `POST` | `/definitions` | Creates or updates a workflow DAG definition. |
| **Execution** | `POST` | `/trigger` | Spawns a new workflow execution instance. |
| | `POST` | `/callbacks/{correlationKey}` | Resumes a suspended workflow step waiting for an asynchronous event. |
| **Observability**| `GET` | `/instances` | Lists workflow instances, filterable by `workflowCode`. |
| | `GET` | `/instances/{id}/logs` | Retrieves granular step execution log events for an instance. |
| | `GET` | `/instances/{id}/diagnostics`| Returns the comprehensive `WorkflowTraceDto` (DAG timings, node bottlenecks, context snapshots). |

---

## 3. Step 1: Query or Toggle Execution Mode

### Query Current Mode:
```bash
curl -X GET http://localhost:8086/api/v1/wes/workflows/mode \
  -H "Accept: application/json"
```

#### Response:
```json
{
  "mode": "SIMULATION",
  "description": "Simulation Mode: Using Virtual Digital Twin PLC & Emulated Gateways"
}
```

### Toggle Mode to Simulation:
```bash
curl -X POST http://localhost:8086/api/v1/wes/workflows/mode \
  -H "Content-Type: application/json" \
  -d '{ "mode": "SIMULATION" }'
```

---

## 4. Step 2: Triggering a Workflow

AI agents can trigger a workflow either inheriting the engine's global mode or explicitly enforcing simulation for a specific run via `simulationMode: true`:

```bash
curl -X POST http://localhost:8086/api/v1/wes/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "workflowCode": "WF_PALLET_INBOUND_INGEST",
    "entityReference": "PAL-9001",
    "simulationMode": true,
    "initialContext": {
      "palletLpn": "PAL-9001",
      "skuCode": "SKU-BEVERAGE-01",
      "quantity": 50,
      "actualWeightKg": 620.5,
      "inboundStationId": "CONV_STN_01"
    }
  }'
```

#### Response (HTTP 202 Accepted):
```json
{
  "instanceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "workflowCode": "WF_PALLET_INBOUND_INGEST",
  "status": "RUNNING",
  "currentStep": "STEP_PROFILE_CHECK",
  "entityReference": "PAL-9001",
  "simulationMode": true,
  "correlationKey": "CORR-PAL-9001-1892",
  "startedAt": "2026-09-20T10:20:00.100Z"
}
```

---

## 5. Step 3: Resuming Asynchronous Handshakes

If a workflow step pauses at a checkpoint (e.g., waiting for an operator barcode confirmation or external quality check), the AI agent or system resumes it via `/callbacks`:

```bash
curl -X POST http://localhost:8086/api/v1/wes/workflows/callbacks/CORR-PAL-9001-1892 \
  -H "Content-Type: application/json" \
  -d '{
    "checkpointVerified": true,
    "scannedBarcode": "PAL-9001",
    "divertLaneApproved": 3
  }'
```

---

## 6. Observability, Diagnostics & Bottleneck Analysis

When an execution completes or stalls, AI agents use the diagnostic endpoints to inspect the full timeline and context variables.

### 6.1 Query Detailed Diagnostic Trace
```bash
curl -X GET http://localhost:8086/api/v1/wes/workflows/instances/3fa85f64-5717-4562-b3fc-2c963f66afa6/diagnostics \
  -H "Accept: application/json"
```

#### Diagnostic Trace Example (`WorkflowTraceDto`):
```json
{
  "instanceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "workflowCode": "WF_PALLET_INBOUND_INGEST",
  "overallStatus": "COMPLETED",
  "totalExecutionDurationMs": 1420,
  "simulation": true,
  "nodeExecutionTraces": [
    {
      "nodeId": "node-1-validate",
      "nodeType": "RULE_EVALUATION",
      "status": "SUCCESS",
      "durationMs": 45,
      "contextSnapshot": { "allRulesPassed": true }
    },
    {
      "nodeId": "node-2-scale",
      "nodeType": "OPCUA_STATION_ACTION",
      "status": "SUCCESS",
      "durationMs": 350,
      "contextSnapshot": { "measuredWeightKg": 620.5, "sensorVerified": true }
    },
    {
      "nodeId": "node-3-asrs-deposit",
      "nodeType": "GRPC_DISPATCH",
      "status": "SUCCESS",
      "durationMs": 1025,
      "contextSnapshot": { "targetBin": "BIN-A-04-12" }
    }
  ],
  "slowestNodeId": "node-3-asrs-deposit",
  "terminalError": null
}
```

---

## 7. Troubleshooting & Failure Recovery Runbook

### Instance Failure Analysis

| Symptom | Root Cause | Debugging Endpoint | Action |
| :--- | :--- | :--- | :--- |
| **Status `SUSPENDED`** | Step is waiting for an asynchronous callback event. | `GET /instances/{id}/diagnostics` | Inspect `correlationKey` and send callback payload to `/callbacks/{key}`. |
| **Status `FAILED`** | Node thrown an unhandled exception or business rule rejection. | `GET /instances/{id}/logs` | Inspect the error message in the last log entry; verify payload variables. |
| **Status `TIMEOUT`** | Hardware or external system failed to respond before step deadline. | `GET /instances/{id}/diagnostics` | Check target PLC or gRPC service connectivity, or test the flow with `simulationMode: true`. |
