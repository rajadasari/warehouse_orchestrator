# API Mapper & External Resource Configuration Guide

This guide provides a completely self-contained operational specification for an AI agent or automated integration harness to configure, authenticate, map, and test external software systems (e.g. WMS, ERP, MES) using only the REST APIs and runtime log outputs of the Warehouse Execution System (WES).

No source code access is required to execute, test, or troubleshoot integrations using this guide.

---

## 1. System Architecture

The integration subsystem allows the WES runtime to dynamically transform warehouse events into outbound REST HTTP requests destined for external third-party systems.

```
+-----------------------------------------------------------------------------------+
|                         WES Runtime Integration Engine                            |
|                                                                                   |
|  +--------------------+     +------------------------+     +-------------------+  |
|  |  Pallet / Inbound  | --> |  Dynamic Template      | --> |  Token & Auth     |  |
|  |     Context Data   |     |  Evaluation Engine     |     |  Lifecycle Cache  |  |
|  +--------------------+     +------------------------+     +-------------------+  |
|                                         |                            |            |
+-----------------------------------------|----------------------------|------------+
                                          v                            v
                      +-------------------------------------------------------------+
                      |         Target External System (e.g. WMS / ERP / MES)       |
                      |  Endpoint: https://wms.company.com/api/v1/inbound/announce  |
                      +-------------------------------------------------------------+
```

### Core Concepts
1. **Resource**: A registered external system endpoint defined by its network host, port, protocol, and authentication credentials.
2. **Dynamic Mapping**: A configurable routing rule that binds an operation type (e.g., `PRE_ANNOUNCE`, `CREATE_ORDER`) to a specific target URL, HTTP method, header set, and JSON payload template.
3. **Template Engine**: An expression evaluator that dynamically substitutes variables (e.g. `{{ pallet.palletLpn }}`) into URLs and payloads while strictly preserving JSON primitive types (numbers, booleans).
4. **Testing Harness**: Synchronous API endpoints (`/preview` and `/test-run`) that allow an AI or operator to test and dry-run dispatches with instant feedback before production release.

---

## 2. Phase 1: External System Resource Configuration via API

Before configuring API mappings, the external system must be registered as a Resource in the WES system.

### 2.1 Register External System Resource
- **Method**: `POST`
- **Path**: `/api/v1/wes/resources`
- **Header**: `Content-Type: application/json`

#### Request Body (OAuth2 Bearer Example):
```json
{
  "resourceId": "LOGIQS-AMBIENT-WMS",
  "name": "Logiqs Ambient WMS Server",
  "type": "WMS",
  "category": "SOFTWARE",
  "application": "WMS",
  "protocol": "http",
  "host": "192.168.1.100",
  "port": 8089,
  "status": "ACTIVE",
  "description": "Primary Logiqs WMS system for ambient storage",
  "customProperties": {
    "ip": "192.168.1.100",
    "port": 8089,
    "authMethod": "OAUTH2_BEARER",
    "tokenPath": "/api/v1/auth/token",
    "tokenResponseField": "accessToken",
    "properties": [
      { "key": "clientId", "value": "wes-service-worker", "useForAuth": true },
      { "key": "clientSecret", "value": "sec_wms_prod_9921", "useForAuth": true },
      { "key": "grantType", "value": "client_credentials", "useForAuth": true }
    ]
  }
}
```

#### cURL Command:
```bash
curl -X POST http://localhost:8086/api/v1/wes/resources \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "LOGIQS-AMBIENT-WMS",
    "name": "Logiqs Ambient WMS Server",
    "type": "WMS",
    "category": "SOFTWARE",
    "application": "WMS",
    "protocol": "http",
    "host": "192.168.1.100",
    "port": 8089,
    "status": "ACTIVE",
    "description": "Primary Logiqs WMS system for ambient storage",
    "customProperties": {
      "ip": "192.168.1.100",
      "port": 8089,
      "authMethod": "OAUTH2_BEARER",
      "tokenPath": "/api/v1/auth/token",
      "tokenResponseField": "accessToken",
      "properties": [
        { "key": "clientId", "value": "wes-service-worker", "useForAuth": true },
        { "key": "clientSecret", "value": "sec_wms_prod_9921", "useForAuth": true },
        { "key": "grantType", "value": "client_credentials", "useForAuth": true }
      ]
    }
  }'
```

#### Supported Authentication Configurations in `customProperties`:
| Authentication Type | `authMethod` | Required Properties | Behavior |
| :--- | :--- | :--- | :--- |
| **OAuth2 / Bearer Token** | `"OAUTH2_BEARER"` | `tokenPath`, `tokenResponseField`, `properties` (`useForAuth: true`) | WES posts credentials to `baseUrl + tokenPath`, extracts the token, and caches it in memory. |
| **HTTP Basic Auth** | `"BASIC_AUTH"` | `username`, `password` | Injects `Authorization: Basic <base64>` header on all requests. |
| **API Key** | `"API_KEY"` | `apiKeyHeader`, `apiKeyValue` | Injects custom API key header (e.g. `X-API-KEY: key123`). |
| **No Authentication** | `"NONE"` | None | Dispatches requests without authorization headers. |

---

### 2.2 Verify Resource Connectivity & Authentication

#### Step 1: Explicit Authorization Call
- **Method**: `POST`
- **Path**: `/api/v1/wes/resources/{resourceId}/authorize`
```bash
curl -X POST http://localhost:8086/api/v1/wes/resources/LOGIQS-AMBIENT-WMS/authorize
```
**Expected Response (Success)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "status": {
    "resourceId": "LOGIQS-AMBIENT-WMS",
    "hasToken": true,
    "isValid": true,
    "tokenPreview": "eyJhbGciOi...1A3X9",
    "targetBaseUrl": "http://192.168.1.100:8089",
    "authEndpoint": "http://192.168.1.100:8089/api/v1/auth/token"
  },
  "message": "Authorization successful! Token acquired and cached in memory."
}
```

#### Step 2: Check Token Status
- **Method**: `GET`
- **Path**: `/api/v1/wes/resources/{resourceId}/token-status`
```bash
curl -X GET http://localhost:8086/api/v1/wes/resources/LOGIQS-AMBIENT-WMS/token-status
```

#### Step 3: Test Connection Pre-Flight Check (Optional)
- **Method**: `POST`
- **Path**: `/api/v1/wes/wms/auth/test-connection`
```bash
curl -X POST http://localhost:8086/api/v1/wes/wms/auth/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "LOGIQS-AMBIENT-WMS",
    "baseUrl": "http://192.168.1.100:8089",
    "tokenPath": "/api/v1/auth/token",
    "tokenField": "accessToken",
    "authMethod": "OAUTH2_BEARER",
    "authPayload": {
      "clientId": "wes-service-worker",
      "clientSecret": "sec_wms_prod_9921"
    }
  }'
```

---

## 3. Phase 2: Schema Dictionary & Template Syntax

### 3.1 Fetch Runtime Field Dictionary
- **Method**: `GET`
- **Path**: `/api/v1/wes/mappings/dictionary`
```bash
curl -X GET http://localhost:8086/api/v1/wes/mappings/dictionary
```

#### Available Data Models:
1. **Pallet Variables (`pallet.*`)**:
   - `pallet.palletLpn`: SSCC / Pallet Barcode (e.g. `"PLT-2026-001"`)
   - `pallet.palletTypeCode`: Pallet Type Code (`"EUR_WOOD"`, `"CHEP_PLASTIC"`)
   - `pallet.itemCode`: Item Master Code (`"MAT-COCOA-01"`)
   - `pallet.skuCode`: Stock Keeping Unit Code (`"SKU-CHOCO-800"`)
   - `pallet.quantity`: Loaded Quantity (`1000`)
   - `pallet.uom`: Unit of Measure (`"KG"`, `"EA"`, `"BOX"`)
   - `pallet.lotNumber`: Batch / Lot Identifier (`"LOT-2026-555"`)
   - `pallet.expiryDate`: Expiry Date (`"2027-12-31"`)
   - `pallet.actualWeightKg`: Measured Scale Weight (`1025.5`)
   - `pallet.sourceLocation`: Source Conveyor Bay or Dock (`"RCV-DOCK-01"`)
   - `pallet.status`: Status (`"RECEIVED"`, `"STORED"`)

2. **Resource Variables (`resource.*`)**:
   - `resource.resourceId`: Target Resource ID (`"LOGIQS-AMBIENT-WMS"`)
   - `resource.name`: Display Name
   - `resource.type`: Resource Type (`"WMS"`, `"SOFTWARE"`)
   - `resource.customProperties.<key>`: Any custom property configured on the resource

3. **Authentication Variables (`auth.*` / `token`)**:
   - `token` or `auth.token`: Raw Bearer token string
   - `auth.bearerToken`: Formatted header value (`"Bearer <token>"`)

4. **Built-in Functions (`fn.*`)**:
   - `fn.now`: Current ISO-8601 UTC timestamp (`"2026-09-19T13:30:00Z"`)
   - `fn.uuid`: Random UUID v4 string (`"c3d9a1f2-7b8c-4a3e-9b2f-1a8c9e4d5f6a"`)
   - `fn.epochMillis`: Unix timestamp in milliseconds (`1789812600000`)
   - `fn.epochSeconds`: Unix timestamp in seconds (`1789812600`)

### 3.2 Templating Rules & Type Preservation
- **Handlebars Expression**: `{{ object.field }}` or `{{ object.field | defaultValue }}`.
- **OpenAPI Path Parameter**: `{palletLpn}` or `{id}` in the endpoint URL.
- **Strict Primitive Types**:
  - `{{ pallet.quantity | 1 }}` evaluates to integer `1000` (no quotes in JSON).
  - `{{ pallet.actualWeightKg | 0.0 }}` evaluates to float `1025.5`.
  - `"{{ pallet.palletLpn }}"` evaluates to string `"PLT-2026-001"`.
- **String Concatenation**:
  - `"Identifier: {{ pallet.palletLpn }}"` evaluates to `"Identifier: PLT-2026-001"`.

---

## 4. Phase 3: Dynamic API Mapping Configuration via API

### 4.1 Create an API Mapping
- **Method**: `POST`
- **Path**: `/api/v1/wes/mappings`
- **Header**: `Content-Type: application/json`

#### Request Body:
```json
{
  "mappingCode": "MAP-WMS-PRE-ANNOUNCE",
  "name": "WMS Inbound Pallet Pre-Announce",
  "description": "Notifies Logiqs WMS when a pallet arrives at Inbound Gate",
  "operationType": "PRE_ANNOUNCE",
  "targetResourceId": "LOGIQS-AMBIENT-WMS",
  "httpMethod": "POST",
  "endpointUrl": "/api/v1/inbound/pallets/{palletLpn}/pre-announce",
  "headersTemplate": "{\n  \"Content-Type\": \"application/json\",\n  \"Authorization\": \"Bearer {{ token }}\",\n  \"X-Correlation-ID\": \"{{ fn.uuid }}\"\n}",
  "payloadTemplate": "{\n  \"palletId\": \"{{ pallet.palletLpn }}\",\n  \"type\": \"{{ pallet.palletTypeCode | 'EUR_WOOD' }}\",\n  \"materialCode\": \"{{ pallet.itemCode }}\",\n  \"batchNumber\": \"{{ pallet.lotNumber | 'DEFAULT-LOT' }}\",\n  \"quantity\": {{ pallet.quantity | 1 }},\n  \"unit\": \"{{ pallet.uom | 'EA' }}\",\n  \"certifiedWeight\": {{ pallet.actualWeightKg | 0.0 }},\n  \"dockCode\": \"{{ pallet.sourceLocation | 'RCV-01' }}\",\n  \"receivedAt\": \"{{ fn.now }}\"\n}",
  "conditionRules": "[]",
  "active": true
}
```

#### cURL Command:
```bash
curl -X POST http://localhost:8086/api/v1/wes/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "mappingCode": "MAP-WMS-PRE-ANNOUNCE",
    "name": "WMS Inbound Pallet Pre-Announce",
    "description": "Notifies Logiqs WMS when a pallet arrives at Inbound Gate",
    "operationType": "PRE_ANNOUNCE",
    "targetResourceId": "LOGIQS-AMBIENT-WMS",
    "httpMethod": "POST",
    "endpointUrl": "/api/v1/inbound/pallets/{palletLpn}/pre-announce",
    "headersTemplate": "{\"Content-Type\": \"application/json\", \"Authorization\": \"Bearer {{ token }}\", \"X-Correlation-ID\": \"{{ fn.uuid }}\"}",
    "payloadTemplate": "{\"palletId\": \"{{ pallet.palletLpn }}\", \"type\": \"{{ pallet.palletTypeCode | '\''EUR_WOOD'\'' }}\", \"materialCode\": \"{{ pallet.itemCode }}\", \"batchNumber\": \"{{ pallet.lotNumber | '\''DEFAULT-LOT'\'' }}\", \"quantity\": {{ pallet.quantity | 1 }}, \"unit\": \"{{ pallet.uom | '\''EA'\'' }}\", \"certifiedWeight\": {{ pallet.actualWeightKg | 0.0 }}, \"dockCode\": \"{{ pallet.sourceLocation | '\''RCV-01'\'' }}\", \"receivedAt\": \"{{ fn.now }}\"}",
    "conditionRules": "[]",
    "active": true
  }'
```

### 4.2 Query and Manage Existing Mappings
- **List All Mappings**: `GET /api/v1/wes/mappings`
- **Filter by Resource**: `GET /api/v1/wes/mappings?resourceId=LOGIQS-AMBIENT-WMS`
- **Filter by Operation**: `GET /api/v1/wes/mappings?operationType=PRE_ANNOUNCE`
- **Get Single Mapping**: `GET /api/v1/wes/mappings/{id}`
- **Update Mapping**: `PUT /api/v1/wes/mappings/{id}` (replaces configuration and clears runtime cache)
- **Delete Mapping**: `DELETE /api/v1/wes/mappings/{id}`

---

## 5. Phase 4: Previewing and Testing Mappings

Testing consists of two stages:
1. **In-Memory Preview (`/preview`)**: Validates template syntax, variable substitution, and URL construction without sending network packets.
2. **Live Test-Run (`/test-run`)**: Dispatches a live HTTP call directly to the target system and captures the full request, response, status code, and latency.

### 5.1 In-Memory Template Preview
- **Method**: `POST`
- **Path**: `/api/v1/wes/mappings/preview`
- **Header**: `Content-Type: application/json`

#### Request Body:
```json
{
  "resourceId": "LOGIQS-AMBIENT-WMS",
  "endpointUrl": "/api/v1/inbound/pallets/{palletLpn}/pre-announce",
  "payloadTemplate": "{\n  \"palletId\": \"{{ pallet.palletLpn }}\",\n  \"quantity\": {{ pallet.quantity | 1 }},\n  \"certifiedWeight\": {{ pallet.actualWeightKg }},\n  \"timestamp\": \"{{ fn.now }}\"\n}",
  "testContext": {
    "pallet": {
      "palletLpn": "PLT-TEST-777",
      "quantity": 500,
      "actualWeightKg": 482.3
    }
  }
}
```

#### cURL Command:
```bash
curl -X POST http://localhost:8086/api/v1/wes/mappings/preview \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "LOGIQS-AMBIENT-WMS",
    "endpointUrl": "/api/v1/inbound/pallets/{palletLpn}/pre-announce",
    "payloadTemplate": "{\"palletId\": \"{{ pallet.palletLpn }}\", \"quantity\": {{ pallet.quantity | 1 }}, \"certifiedWeight\": {{ pallet.actualWeightKg }}, \"timestamp\": \"{{ fn.now }}\"}",
    "testContext": {
      "pallet": {
        "palletLpn": "PLT-TEST-777",
        "quantity": 500,
        "actualWeightKg": 482.3
      }
    }
  }'
```

#### Expected Response:
```json
{
  "success": true,
  "resolvedUrl": "/api/v1/inbound/pallets/PLT-TEST-777/pre-announce",
  "resolvedPayload": "{\n  \"palletId\" : \"PLT-TEST-777\",\n  \"quantity\" : 500,\n  \"certifiedWeight\" : 482.3,\n  \"timestamp\" : \"2026-09-19T13:35:12.450Z\"\n}",
  "sampleContext": { ... }
}
```

---

### 5.2 Execute Live Test-Run Dispatch
- **Method**: `POST`
- **Path**: `/api/v1/wes/mappings/test-run`
- **Header**: `Content-Type: application/json`

#### Request Body:
```json
{
  "resourceId": "LOGIQS-AMBIENT-WMS",
  "httpMethod": "POST",
  "endpointUrl": "/api/v1/inbound/pallets/{palletLpn}/pre-announce",
  "headersTemplate": "{\n  \"Content-Type\": \"application/json\",\n  \"Authorization\": \"Bearer {{ token }}\"\n}",
  "payloadTemplate": "{\n  \"palletId\": \"{{ pallet.palletLpn }}\",\n  \"quantity\": {{ pallet.quantity | 1 }},\n  \"certifiedWeight\": {{ pallet.actualWeightKg }}\n}",
  "testContext": {
    "pallet": {
      "palletLpn": "PLT-TEST-777",
      "quantity": 500,
      "actualWeightKg": 482.3
    }
  }
}
```

#### cURL Command:
```bash
curl -X POST http://localhost:8086/api/v1/wes/mappings/test-run \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "LOGIQS-AMBIENT-WMS",
    "httpMethod": "POST",
    "endpointUrl": "/api/v1/inbound/pallets/{palletLpn}/pre-announce",
    "headersTemplate": "{\"Content-Type\": \"application/json\", \"Authorization\": \"Bearer {{ token }}\"}",
    "payloadTemplate": "{\"palletId\": \"{{ pallet.palletLpn }}\", \"quantity\": {{ pallet.quantity | 1 }}, \"certifiedWeight\": {{ pallet.actualWeightKg }}\"}",
    "testContext": {
      "pallet": {
        "palletLpn": "PLT-TEST-777",
        "quantity": 500,
        "actualWeightKg": 482.3
      }
    }
  }'
```

#### Case A: Successful Response (`200 OK`)
```json
{
  "success": true,
  "targetUrl": "http://192.168.1.100:8089/api/v1/inbound/pallets/PLT-TEST-777/pre-announce",
  "requestPayload": "{\"palletId\":\"PLT-TEST-777\",\"quantity\":500,\"certifiedWeight\":482.3}",
  "statusCode": 200,
  "responsePayload": "{\"status\":\"ACCEPTED\",\"wmsReceiptId\":\"REC-99481\",\"allocatedAisle\":3}"
}
```

#### Case B: Target External Host Offline (`503 Service Unavailable`)
```json
{
  "success": false,
  "targetUrl": "http://192.168.1.100:8089/api/v1/inbound/pallets/PLT-TEST-777/pre-announce",
  "requestPayload": "{\"palletId\":\"PLT-TEST-777\",\"quantity\":500,\"certifiedWeight\":482.3}",
  "statusCode": 503,
  "responsePayload": "{\n  \"error\": \"Server Unavailable / Connection Failed\",\n  \"targetUrl\": \"http://192.168.1.100:8089/api/v1/inbound/pallets/PLT-TEST-777/pre-announce\",\n  \"details\": \"Connection refused: connect\"\n}",
  "error": "Server connection failed: Connection refused: connect"
}
```

#### Case C: Target Server Rejected Data (`400 Bad Request` or `422 Unprocessable`)
```json
{
  "success": false,
  "targetUrl": "http://192.168.1.100:8089/api/v1/inbound/pallets/PLT-TEST-777/pre-announce",
  "requestPayload": "{\"palletId\":\"PLT-TEST-777\",\"quantity\":500,\"certifiedWeight\":482.3}",
  "statusCode": 400,
  "responsePayload": "{\"error\":\"INVALID_LOT_FORMAT\",\"message\":\"Lot number LOT-2026-555 expired\"}",
  "error": "HTTP 400 Bad Request"
}
```

---

## 6. Phase 5: Log Retrieval, Diagnostic Markers & Log Analysis

When an AI agent or operator is testing endpoints, logs can be examined through the synchronous response body, stdout console streams, and database records.

### 6.1 Diagnostic Sources Overview
1. **Synchronous Test-Run Response Body**: The `/test-run` response contains the exact request payload sent, target URL called, HTTP status code received, and raw response payload returned.
2. **Service Console / stdout Stream**: Contains structured audit blocks emitted on every outbound and inbound HTTP interaction.
3. **Database Audit Records**: Execution entries logged in table `wes.pallet_process_log`.

---

### 6.2 Standard Log Output Markers

The runtime emits structured text blocks to the console log stream during software communication:

#### 1. Outbound Software Request Block
```text
========================== [OUTBOUND SOFTWARE REQUEST] ==========================
Correlation ID : c3d9a1f2-7b8c-4a3e-9b2f-1a8c9e4d5f6a
Method & URI   : POST http://192.168.1.100:8089/api/v1/inbound/pallets/PLT-2026-001/pre-announce
Headers        : [Content-Type: application/json, Auth: Bearer eyJhbG...3X9, Accept: application/json, */*]
Payload Body   :
{
  "palletId": "PLT-2026-001",
  "materialCode": "MAT-COCOA-01",
  "quantity": 1000,
  "certifiedWeight": 1025.5
}
--------------------------------------------------------------------------------
```

#### 2. Inbound Software Response Block
```text
========================== [INBOUND SOFTWARE RESPONSE] ==========================
Correlation ID : c3d9a1f2-7b8c-4a3e-9b2f-1a8c9e4d5f6a
Target URI     : POST http://192.168.1.100:8089/api/v1/inbound/pallets/PLT-2026-001/pre-announce
Status         : 200 OK
Duration       : 142 ms
Response Body  :
{
  "status": "ACCEPTED",
  "wmsReceiptId": "REC-99481",
  "allocatedAisle": 3
}
=================================================================================
```

#### 3. Outbound Connection Failure Block
```text
========================== [OUTBOUND SOFTWARE CALL FAILED] ==========================
Correlation ID : c3d9a1f2-7b8c-4a3e-9b2f-1a8c9e4d5f6a
Target URI     : POST http://192.168.1.100:8089/api/v1/inbound/pallets/PLT-2026-001/pre-announce
Duration       : 5002 ms
Failure Cause  : Connection refused: connect
=====================================================================================
```

#### 4. Template Engine Log Messages
- **Unresolved Token Trace**:
  ```text
  Unresolved token 'pallet.customField' (failed on 'customField', available keys: [...], fallback default: 'N/A')
  ```
- **Template Syntax Error**:
  ```text
  Template evaluation failed! Available context keys: [pallet, resource, auth, fn], Error: Unexpected character...
  ```

#### 5. Token Authentication Log Messages
- **Token Acquisition**:
  ```text
  Acquiring new software integration token for resource 'LOGIQS-AMBIENT-WMS' from http://192.168.1.100:8089/api/v1/auth/token
  ```
- **Token Invalidation**:
  ```text
  Invalidating cached software integration token for resource 'LOGIQS-AMBIENT-WMS'
  ```
- **Token Acquisition Rejection**:
  ```text
  Failed to acquire token from http://192.168.1.100:8089/api/v1/auth/token: HTTP 401 Unauthorized - {"error":"invalid_client"}
  ```

---

### 6.3 Enabling Verbose Debug Logging

If testing requires deeper tracing of variable substitutions and HTTP headers, run the WES service with debug logging enabled:

```bash
mvn spring-boot:run -pl services/wes-service -am \
  '-Dspring-boot.run.jvmArguments=-Dlogging.level.com.company.warehouse=DEBUG'
```

---

### 6.4 Database Audit Verification Query

To inspect asynchronous background dispatches executed by workflows:
```sql
SELECT
    id,
    pallet_lpn,
    event_type,
    status,
    details,
    created_at
FROM wes.pallet_process_log
WHERE pallet_lpn = 'PLT-2026-001'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 7. Automated AI Decision & Diagnostic Matrix

When an AI agent tests an endpoint, it must inspect the returned HTTP status code and response payload, categorizing the result and executing the corresponding action:

| Error Category | Response Status & Log Signature | Root Cause | Automated Action Required |
| :--- | :--- | :--- | :--- |
| **Host Unreachable** | `statusCode: 503`<br>`Connection refused: connect`<br>`[OUTBOUND SOFTWARE CALL FAILED]` | Host IP or Port is incorrect, or external server is down. | Call `GET /api/v1/wes/resources/{id}` to verify host and port. Confirm server process is running on target port. |
| **Auth Failure** | `statusCode: 401` or `403`<br>`invalid_client`<br>`Failed to acquire token` | Invalid credentials, expired token, or incorrect token URL path. | Call `GET /api/v1/wes/resources/{id}/token-status` to inspect `lastError`. Update `customProperties` credentials. |
| **Template Syntax** | `statusCode: 500`<br>`Template evaluation failed`<br>`JsonProcessingException` | Invalid JSON syntax or unescaped characters in template. | Use `POST /api/v1/wes/mappings/preview` to validate JSON structure and quote matching before live dispatches. |
| **Missing Parameter** | `Unresolved token` in console log or empty string in payload | Placeholder in template does not match dictionary schema. | Call `GET /api/v1/wes/mappings/dictionary` and align placeholders with available schema fields. |
| **Business Rejection** | `statusCode: 400` or `422`<br>`responsePayload: {"error": "..."}` | Target application rejected business payload data. | Inspect `responsePayload` body to determine rejected field (e.g. invalid SKU, missing dock) and adjust `testContext`. |
| **Success** | `statusCode: 200` or `201`<br>`success: true` | Request was formed, authenticated, delivered, and accepted. | Confirm mapping by setting `active: true` for production orchestration. |

---

## 8. Summary Checklist for Automated AI Testing

1. `POST /api/v1/wes/resources` -> Register external system host, port, and authentication scheme.
2. `POST /api/v1/wes/resources/{id}/authorize` -> Verify connection and ensure Bearer token is acquired.
3. `GET /api/v1/wes/mappings/dictionary` -> Check available payload variables and built-in functions.
4. `POST /api/v1/wes/mappings` -> Store API endpoint route, HTTP method, headers, and payload template.
5. `POST /api/v1/wes/mappings/preview` -> Test template resolution in memory with test context.
6. `POST /api/v1/wes/mappings/test-run` -> Execute live dry-run call to target system.
7. Check response `statusCode` and inspect log markers (`[OUTBOUND SOFTWARE REQUEST]`, `[INBOUND SOFTWARE RESPONSE]`).
8. Apply the **Diagnostic Matrix** to resolve any connection or payload discrepancy.
