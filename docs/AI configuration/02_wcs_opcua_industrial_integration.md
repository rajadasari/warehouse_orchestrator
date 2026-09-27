# WCS Industrial OPC UA Integration & Diagnostics Guide

The **Warehouse Control System (WCS) OPC UA Integration Subsystem** connects the orchestrator to floor-level industrial automation: conveyor lines, barcode scanners, dimensioning scales, lifters, diverters, and programmable logic controllers (PLCs).

It provides AI agents with full programmatic control to configure client/server endpoints, map tag dictionaries, compose conveyor sequence nodes, execute live handshakes, and interactively probe PLC memory.

---

## 1. System Topology & Flow

```
 +-------------------------------------------------------------------------------+
 |                           AI AGENT / WES ORCHESTRATOR                         |
 +-------------------------------------------------------------------------------+
           |                                                      ^
           | REST (/composer/generate-node)                       | REST (/runtime/read)
           v                                                      |
 +-------------------------------------------------------------------------------+
 |                            WCS OPC UA SUBSYSTEM                               |
 |                                                                               |
 |  +-----------------------+  +----------------------+  +--------------------+  |
 |  | Station Node Composer |  | Tag Dictionary / Grp |  | Interactive Engine |  |
 |  | (Sequence Templates)  |  | (Namespaces/Types)   |  | (Batch/Browse/IO)  |  |
 |  +-----------------------+  +----------------------+  +--------------------+  |
 |              |                         |                         |            |
 |              +-------------------------+-------------------------+            |
 |                                        |                                      |
 |                           +--------------------------+                        |
 |                           | Milo OPC UA Client Pool  |                        |
 |                           +--------------------------+                        |
 +----------------------------------------|--------------------------------------+
                                          | opc.tcp://
                                          v
 +-------------------------------------------------------------------------------+
 |                       PHYSICAL FLOOR PLC / VIRTUAL EDGE                       |
 |  - Siemens S7-1500 / Beckhoff TwinCAT / Allen-Bradley ControlLogix           |
 |  - Conveyor Station 01: [ PalletPresent, Barcode, Weight, DivertTarget ]     |
 +-------------------------------------------------------------------------------+
```

---

## 2. API Endpoints Reference

Base Path: `http://localhost:8087/api/v1/wcs/opcua`

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Introspection** | `GET` | `/ai-schema` | Discovers supported security policies, auth types, data types, and node formats. |
| **Validation** | `POST` | `/validate` | Pre-flight validation of candidate client, server, tag, or template configurations. |
| **Clients** | `GET` | `/clients` | Lists all registered OPC UA client connections. |
| | `GET` | `/clients/{code}` | Retrieves a single OPC UA client connection profile. |
| | `POST` | `/clients` | Creates or updates an OPC UA client connection profile. |
| | `DELETE` | `/clients/{code}` | Deletes an OPC UA client connection profile. |
| **Servers** | `GET` | `/servers` | Lists all embedded OPC UA servers hosted by WCS. |
| | `POST` | `/servers` | Configures an embedded OPC UA server endpoint. |
| | `DELETE` | `/servers/{code}` | Deletes an embedded server configuration. |
| **Tags** | `GET` | `/tags` | Lists all mapped OPC UA tag definitions. |
| | `POST` | `/tags` | Registers or updates a tag mapping. |
| | `DELETE` | `/tags/{key}` | Deletes a tag mapping. |
| **Tag Groups** | `GET` | `/tag-groups` | Lists all defined logical tag groups. |
| | `POST` | `/tag-groups` | Creates or updates a tag group. |
| | `DELETE` | `/tag-groups/{key}` | Deletes a tag group. |
| **Composer** | `GET` | `/composer/templates` | Lists conveyor station sequence templates. |
| | `POST` | `/composer/templates` | Saves a conveyor station sequence template. |
| | `POST` | `/composer/generate-node` | Composes a reusable workflow canvas node for a physical station. |
| | `POST` | `/composer/execute` | Directly executes a station sequence handshake. |
| **Runtime Diagnostics** | `POST` | `/runtime/{code}/read-single` | Reads a single tag value directly from the PLC. |
| | `POST` | `/runtime/{code}/write-single`| Writes a single value to a PLC tag. |
| | `POST` | `/runtime/{code}/read-batch` | Reads multiple tags in a single optimized roundtrip. |
| | `POST` | `/runtime/{code}/write-batch`| Writes multiple tags atomically. |
| | `POST` | `/runtime/{code}/read-group/{groupKey}` | Reads an entire named logical tag group. |
| | `POST` | `/runtime/{code}/write-group/{groupKey}`| Writes values to all tags within a group. |
| | `POST` | `/runtime/{code}/browse` | Browses the OPC UA AddressSpace tree starting at a nodeId. |

---

## 3. Step 1: Discover Capabilities via `/ai-schema`

```bash
curl -X GET http://localhost:8087/api/v1/wcs/opcua/ai-schema \
  -H "Accept: application/json"
```

#### Response:
```json
{
  "version": "1.0.0-WCS-OPCUA",
  "supportedDataTypes": ["BOOLEAN", "INT16", "INT32", "INT64", "FLOAT", "DOUBLE", "STRING", "BYTE_STRING", "DATE_TIME"],
  "supportedSecurityPolicies": ["NONE", "BASIC128_RSA15", "BASIC256", "BASIC256_SHA256", "AES128_SHA256_RSAOAEP", "AES256_SHA256_RSAPSS"],
  "supportedAuthTypes": ["ANONYMOUS", "USERNAME_PASSWORD", "CERTIFICATE"],
  "handshakeStepTypes": ["READ_TAG", "WRITE_TAG", "WAIT_VALUE", "CALCULATE", "CONDITION_BRANCH"],
  "nodeIdFormatExamples": {
    "stringIdentifier": "ns=2;s=Line1.LoadingStation01.Barcode",
    "numericIdentifier": "ns=1;i=1001",
    "guidIdentifier": "ns=2;g=12345678-1234-1234-1234-123456789abc"
  }
}
```

---

## 4. Step 2: Configure OPC UA Clients & Servers

### 4.1 Dry-Run Validation First
Validate client configuration before saving:

```bash
curl -X POST http://localhost:8087/api/v1/wcs/opcua/validate \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "CLIENT",
    "payload": {
      "clientCode": "PLC_CONVEYOR_LINE_01",
      "endpointUrl": "opc.tcp://192.168.10.50:4840",
      "securityPolicy": "BASIC256_SHA256",
      "authType": "USERNAME_PASSWORD",
      "username": "wcs_service_user"
    }
  }'
```

### 4.2 Save Client Configuration
```bash
curl -X POST http://localhost:8087/api/v1/wcs/opcua/clients \
  -H "Content-Type: application/json" \
  -d '{
    "clientCode": "PLC_CONVEYOR_LINE_01",
    "clientName": "Conveyor Line 01 Main PLC",
    "endpointUrl": "opc.tcp://192.168.10.50:4840",
    "securityPolicy": "NONE",
    "authType": "ANONYMOUS",
    "sessionTimeoutMs": 30000,
    "requestTimeoutMs": 5000,
    "active": true
  }'
```

---

## 5. Step 3: Register Tag Groups & Station Templates

### 5.1 Create Logical Tag Group
Group related tags together for high-performance batch polling:

```bash
curl -X POST http://localhost:8087/api/v1/wcs/opcua/tag-groups \
  -H "Content-Type: application/json" \
  -d '{
    "groupKey": "GRP_INBOUND_SCAN_STATION",
    "description": "All tags read upon pallet arrival at Inbound Scan Station",
    "tagKeys": ["PalletPresent", "Barcode", "GrossWeightKg", "HeightMm"]
  }'
```

### 5.2 Create Conveyor Station Sequence Template
Templates allow infinite replication of identical station sequences across the warehouse floor:

```bash
curl -X POST http://localhost:8087/api/v1/wcs/opcua/composer/templates \
  -H "Content-Type: application/json" \
  -d '{
    "templateCode": "TPL_INBOUND_CHECK_STATION",
    "name": "Standard Inbound Verification Station",
    "description": "Reads barcode and weight, waits for WES routing decision, and triggers diverter",
    "relativeTags": [
      { "tagKey": "PalletPresent", "dataType": "BOOLEAN", "accessLevel": "READ" },
      { "tagKey": "Barcode", "dataType": "STRING", "accessLevel": "READ" },
      { "tagKey": "WeightKg", "dataType": "DOUBLE", "accessLevel": "READ" },
      { "tagKey": "TargetLane", "dataType": "INT32", "accessLevel": "WRITE" },
      { "tagKey": "ReleaseClear", "dataType": "BOOLEAN", "accessLevel": "WRITE" }
    ],
    "flowDefinition": {
      "steps": [
        { "stepIndex": 1, "type": "WAIT_VALUE", "tagKey": "PalletPresent", "expectedValue": true, "timeoutMs": 15000 },
        { "stepIndex": 2, "type": "READ_TAG", "tagKey": "Barcode", "targetVariable": "scannedBarcode" },
        { "stepIndex": 3, "type": "READ_TAG", "tagKey": "WeightKg", "targetVariable": "measuredWeight" },
        { "stepIndex": 4, "type": "WRITE_TAG", "tagKey": "TargetLane", "sourceVariable": "calculatedLane" },
        { "stepIndex": 5, "type": "WRITE_TAG", "tagKey": "ReleaseClear", "sourceVariable": true }
      ]
    }
  }'
```

### 5.3 Generate Workflow Canvas Node
Generate a UI workflow node for Station 01 bound to the template:

```bash
curl -X POST http://localhost:8087/api/v1/wcs/opcua/composer/generate-node \
  -H "Content-Type: application/json" \
  -d '{
    "templateCode": "TPL_INBOUND_CHECK_STATION",
    "stationCode": "CONV_STN_01",
    "clientCode": "PLC_CONVEYOR_LINE_01",
    "tagPrefix": "ns=2;s=Line1.LoadingStation01.",
    "positionX": 350.0,
    "positionY": 200.0
  }'
```

#### Response:
```json
{
  "nodeId": "node-conv-stn-01",
  "nodeType": "OPCUA_STATION_ACTION",
  "label": "CONV_STN_01: Standard Inbound Verification Station",
  "canvasNodeConfig": {
    "templateCode": "TPL_INBOUND_CHECK_STATION",
    "stationCode": "CONV_STN_01",
    "clientCode": "PLC_CONVEYOR_LINE_01",
    "tagPrefix": "ns=2;s=Line1.LoadingStation01.",
    "position": { "x": 350.0, "y": 200.0 }
  }
}
```

---

## 6. Interactive Runtime Diagnostics & Hardware Probing

AI agents can interactively probe, verify, and manipulate live PLC tags without needing a PLC programming environment.

### 6.1 Read a Live Tag
```bash
curl -X POST "http://localhost:8087/api/v1/wcs/opcua/runtime/PLC_CONVEYOR_LINE_01/read-single?tagKey=ns=2;s=Line1.LoadingStation01.Barcode"
```

#### Response:
```json
{
  "tagKey": "ns=2;s=Line1.LoadingStation01.Barcode",
  "value": "PAL-881290",
  "dataType": "STRING",
  "statusCode": "GOOD",
  "serverTimestamp": "2026-09-20T10:15:30.122Z"
}
```

### 6.2 Write a Value to PLC Tag
```bash
curl -X POST http://localhost:8087/api/v1/wcs/opcua/runtime/PLC_CONVEYOR_LINE_01/write-single \
  -H "Content-Type: application/json" \
  -d '{
    "tagKey": "ns=2;s=Line1.LoadingStation01.TargetLane",
    "value": 4
  }'
```

### 6.3 Read Tag Group
Read all sensors in a single network round-trip:

```bash
curl -X POST http://localhost:8087/api/v1/wcs/opcua/runtime/PLC_CONVEYOR_LINE_01/read-group/GRP_INBOUND_SCAN_STATION
```

### 6.4 Browse PLC Address Space Hierarchy
Discover unfamiliar tags on the floor PLC:

```bash
curl -X POST "http://localhost:8087/api/v1/wcs/opcua/runtime/PLC_CONVEYOR_LINE_01/browse?nodeId=ns=2;s=Line1"
```

---

## 7. Diagnostic & Troubleshooting Runbook

### Error Diagnostic Decision Matrix

| StatusCode / Error | Root Cause | AI Action / Resolution |
| :--- | :--- | :--- |
| **`BadNodeIdUnknown`** | The tag identifier does not exist on the target PLC. | Check namespace index (`ns=`) and variable name spelling. Call `/browse` on parent node to discover correct NodeId. |
| **`BadSecurityChecksFailed`** | Security policy mismatch (e.g. PLC requires `BASIC256_SHA256` with certificate exchange, client requested `NONE`). | Update client profile via `POST /clients` with matching `securityPolicy` and provide valid certificate keyStore. |
| **`BadNotWritable`** | Tag is marked read-only in PLC datablock (DB). | Verify PLC access rights. Ensure tag is in an un-optimized read/write DB. |
| **`HandshakeTimeout`** | PLC did not assert handshake tag (e.g. `PalletPresent`) before step timeout expired. | Check photo-electric proximity sensor on conveyor line; verify pallet is physically positioned over sensor. |
| **`ConnectionRefused`** | PLC is powered off, port 4840 is firewalled, or IP is unreachable. | Ping PLC IP address; check network switch VLAN routing between orchestrator server and industrial OT network. |

### Simulation vs Real Hardware Switch
If the physical PLC is undergoing electrical maintenance, AI agents can redirect the client configuration to the **WCS Virtual Edge Server** (`opc.tcp://localhost:4840/wcs/opcua`) to run end-to-end simulations without disrupting physical conveyors.
