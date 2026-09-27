# Universal Integration Engine & Channel API Guide

The **Universal Integration Engine** in WES allows AI agents and integration engineers to configure ingress channels that ingest data from third-party systems (WMS, ERP, MES, SAP EWM) across arbitrary data formats (**JSON, XML, SAP IDoc, CSV/Delimited**), apply declarative transformations, execute a **5-Tier Rule Engine**, enforce protocol handshakes, and trigger downstream orchestrations.

---

## 1. Engine Ingress Pipeline Architecture

```
 Raw Document (JSON / XML / IDoc / Delimited)
                      |
                      v
 +---------------------------------------------------------+
 | 1. AutoDetectingDataParser                              |
 |    - Sniffs format automatically (JSON vs XML vs Text)  |
 |    - Flattens hierarchical structures into Map<K, V>    |
 +---------------------------------------------------------+
                      |
                      v
 +---------------------------------------------------------+
 | 2. DynamicMappingEngine                                 |
 |    - Applies declarative FieldMappingRules              |
 |    - Type coercions (STRING, INTEGER, DECIMAL, BOOLEAN) |
 |    - Default values & custom transformation SpEL        |
 +---------------------------------------------------------+
                      |
                      v
 +---------------------------------------------------------+
 | 3. RuleEngineDispatcher (5-Tier Rule Pipeline)          |
 |    - KEY_VALUE_MATCH (Equality, Regex, Non-empty)       |
 |    - DATABASE_LOOKUP (SKU_EXISTS, PALLET_EXISTS, etc.)  |
 |    - NUMERIC_COMPARISON (Thresholds, Weight limits)     |
 |    - CALCULATED_EXPRESSION (SpEL formulas)              |
 +---------------------------------------------------------+
         |                                |
   (If critical rule fails)        (If all rules pass)
         v                                v
 +-----------------------+        +--------------------------------+
 | RuleStateTransition   |        | UniversalHandshakeManager      |
 | - REJECT / QUARANTINE |        | - Initiates session            |
 | - Transitions state   |        | - SYNC_IMMEDIATE / ASYNC_*     |
 | - Emits failure 422   |        +--------------------------------+
 +-----------------------+                        |
                                                  v
                                      +------------------------+
                                      | Trigger WES Workflow   |
                                      +------------------------+
```

---

## 2. API Endpoints Reference

Base Path: `http://localhost:8086/api/v1/wes/integration`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/channels/ai-schema` | Introspects supported rules, operators, formats, and handshake modes. |
| `POST` | `/channels/validate` | Pre-flight dry-run testing of candidate mappings and rules against a sample payload. |
| `GET` | `/channels` | Lists all configured integration channels. |
| `GET` | `/channels/{channelCode}` | Retrieves configuration for a specific channel. |
| `POST` | `/channels` | Registers a new integration channel. |
| `PUT` | `/channels/{channelCode}` | Updates an existing integration channel. |
| `DELETE` | `/channels/{channelCode}` | Deletes an integration channel. |
| `POST` | `/channels/{channelCode}/ingest` | Universal ingress gateway for incoming business documents. |
| `POST` | `/idoc` | Backward-compatible SAP EWM IDoc gateway (routes to `INBOUND_PALLET_CHANNEL`). |
| `POST` | `/callbacks` | Universal callback completion gateway for asynchronous handshakes. |

---

## 3. Step 1: Introspecting the AI Schema

AI agents must first call `/channels/ai-schema` to discover the live system capabilities:

```bash
curl -X GET http://localhost:8086/api/v1/wes/integration/channels/ai-schema \
  -H "Accept: application/json"
```

#### Response Example:
```json
{
  "apiVersion": "v1",
  "supportedDirections": ["INGRESS", "EGRESS", "BIDIRECTIONAL"],
  "supportedDomains": ["INBOUND", "OUTBOUND", "INTERNAL_TRANSFER", "INVENTORY", "EQUIPMENT"],
  "supportedFormats": ["AUTO", "XML", "JSON"],
  "supportedHandshakeModes": [
    { "mode": "SYNC_IMMEDIATE", "description": "Request-response in same connection" },
    { "mode": "ASYNC_CALLBACK", "description": "202 Accepted + correlationKey, external callback signals completion" },
    { "mode": "ASYNC_POLLING", "description": "202 Accepted + correlationKey, engine periodic poll until done" },
    { "mode": "ASYNC_EVENT", "description": "Asynchronous pub/sub on MQTT or EventBus" }
  ],
  "supportedRuleTypes": [
    { "type": "KEY_VALUE_MATCH", "operators": ["EQUALS", "NOT_EQUALS", "IN", "NOT_IN", "REGEX", "IS_NOT_EMPTY"] },
    { "type": "DATABASE_LOOKUP", "lookupTargets": ["SKU_EXISTS", "PALLET_EXISTS", "RESOURCE_EXISTS", "RESOURCE_TAG_EXISTS"] },
    { "type": "NUMERIC_COMPARISON", "operators": ["BETWEEN_INCLUSIVE", "GREATER_THAN", "LESS_THAN", "EQUALS", "NOT_EQUALS"] },
    { "type": "CALCULATED_EXPRESSION", "description": "Spring SpEL math expression e.g. 'actualWeightKg >= (unitWeightKg * quantity * 0.9)'" }
  ],
  "sampleConfigEndpoint": "POST /api/v1/wes/integration/channels",
  "dryRunValidationEndpoint": "POST /api/v1/wes/integration/channels/validate"
}
```

---

## 4. Step 2: Zero-Risk Dry-Run Validation (`/validate`)

Before saving any channel to production, an AI agent should dry-run the candidate rules and mappings against real sample documents.

```bash
curl -X POST http://localhost:8086/api/v1/wes/integration/channels/validate \
  -H "Content-Type: application/json" \
  -d '{
    "samplePayload": "<inboundAnnouncement><palletLpn>PAL-9001</palletLpn><itemCode>SKU-BEVERAGE-01</itemCode><qty>50</qty><grossWeightKg>620.5</grossWeightKg></inboundAnnouncement>",
    "payloadFormat": "AUTO",
    "mappingRules": [
      { "sourceField": "palletLpn", "targetField": "palletLpn", "targetType": "STRING", "mandatory": true },
      { "sourceField": "itemCode", "targetField": "skuCode", "targetType": "STRING", "mandatory": true },
      { "sourceField": "qty", "targetField": "quantity", "targetType": "INTEGER", "mandatory": true },
      { "sourceField": "grossWeightKg", "targetField": "actualWeightKg", "targetType": "DECIMAL", "mandatory": true }
    ],
    "validationRules": [
      {
        "ruleId": "CHK_PALLET_FORMAT",
        "ruleType": "KEY_VALUE_MATCH",
        "targetField": "palletLpn",
        "operator": "REGEX",
        "expectedValue": "^PAL-\\d{4,8}$",
        "errorMessage": "Pallet LPN must start with PAL- followed by digits",
        "critical": true
      },
      {
        "ruleId": "CHK_SKU_MASTER",
        "ruleType": "DATABASE_LOOKUP",
        "targetField": "skuCode",
        "lookupTarget": "SKU_EXISTS",
        "errorMessage": "SKU does not exist in master catalog",
        "critical": true,
        "failureAction": "QUARANTINE",
        "transitionState": "QUARANTINE_UNKNOWN_SKU"
      },
      {
        "ruleId": "CHK_WEIGHT_LIMIT",
        "ruleType": "NUMERIC_COMPARISON",
        "targetField": "actualWeightKg",
        "operator": "LESS_THAN",
        "expectedValue": 1500.0,
        "errorMessage": "Pallet weight exceeds maximum permissible limit of 1500kg",
        "critical": true,
        "failureAction": "REJECT",
        "transitionState": "REJECTED_OVERWEIGHT"
      }
    ]
  }'
```

#### Dry-Run Response:
```json
{
  "valid": true,
  "detectedFormat": "XML",
  "parsedRawData": {
    "palletLpn": "PAL-9001",
    "itemCode": "SKU-BEVERAGE-01",
    "qty": "50",
    "grossWeightKg": "620.5"
  },
  "transformedData": {
    "palletLpn": "PAL-9001",
    "skuCode": "SKU-BEVERAGE-01",
    "quantity": 50,
    "actualWeightKg": 620.5
  },
  "ruleEvaluationResults": [
    { "ruleId": "CHK_PALLET_FORMAT", "passed": true, "errorMessage": null, "critical": true },
    { "ruleId": "CHK_SKU_MASTER", "passed": true, "errorMessage": null, "critical": true },
    { "ruleId": "CHK_WEIGHT_LIMIT", "passed": true, "errorMessage": null, "critical": true }
  ],
  "configurationWarnings": []
}
```

---

## 5. Step 3: Registering or Updating a Channel

When validation succeeds, create or update the channel:

```bash
curl -X POST http://localhost:8086/api/v1/wes/integration/channels \
  -H "Content-Type: application/json" \
  -d '{
    "channelCode": "INBOUND_PALLET_CHANNEL",
    "channelName": "Main Inbound Pallet Ingress Channel",
    "direction": "INGRESS",
    "domain": "INBOUND",
    "payloadFormat": "AUTO",
    "defaultSuccessState": "PRE_ANNOUNCED",
    "workflowCode": "WF_PALLET_INBOUND_INGEST",
    "active": true,
    "handshakeConfig": {
      "mode": "ASYNC_CALLBACK",
      "timeoutSeconds": 60,
      "correlationField": "palletLpn",
      "retryCount": 3
    },
    "mappingRules": [
      { "sourceField": "palletLpn", "targetField": "palletLpn", "targetType": "STRING", "mandatory": true },
      { "sourceField": "itemCode", "targetField": "skuCode", "targetType": "STRING", "mandatory": true },
      { "sourceField": "qty", "targetField": "quantity", "targetType": "INTEGER", "mandatory": true },
      { "sourceField": "grossWeightKg", "targetField": "actualWeightKg", "targetType": "DECIMAL", "mandatory": true }
    ],
    "validationRules": [
      {
        "ruleId": "CHK_PALLET_FORMAT",
        "ruleType": "KEY_VALUE_MATCH",
        "targetField": "palletLpn",
        "operator": "REGEX",
        "expectedValue": "^PAL-\\d{4,8}$",
        "errorMessage": "Pallet LPN format invalid",
        "critical": true
      },
      {
        "ruleId": "CHK_SKU_MASTER",
        "ruleType": "DATABASE_LOOKUP",
        "targetField": "skuCode",
        "lookupTarget": "SKU_EXISTS",
        "errorMessage": "SKU does not exist in master catalog",
        "critical": true,
        "failureAction": "QUARANTINE",
        "transitionState": "QUARANTINE_UNKNOWN_SKU"
      },
      {
        "ruleId": "CHK_WEIGHT_LIMIT",
        "ruleType": "NUMERIC_COMPARISON",
        "targetField": "actualWeightKg",
        "operator": "LESS_THAN",
        "expectedValue": 1500.0,
        "errorMessage": "Pallet weight exceeds 1500kg",
        "critical": true,
        "failureAction": "REJECT",
        "transitionState": "REJECTED_OVERWEIGHT"
      }
    ]
  }'
```

---

## 6. Runtime Ingress & Webhook Execution

### 6.1 Ingesting a Document
External systems post payloads to `/channels/{channelCode}/ingest`:

```bash
curl -X POST http://localhost:8086/api/v1/wes/integration/channels/INBOUND_PALLET_CHANNEL/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "palletLpn": "PAL-9001",
    "itemCode": "SKU-BEVERAGE-01",
    "qty": 50,
    "grossWeightKg": 620.5
  }'
```

#### Synchronous Success (HTTP 200 OK):
Returned when `handshakeConfig.mode` is `SYNC_IMMEDIATE`:
```json
{
  "correlationKey": "PAL-9001",
  "channelCode": "INBOUND_PALLET_CHANNEL",
  "status": "PROCESSED",
  "state": "PRE_ANNOUNCED",
  "allRulesPassed": true,
  "mode": "SYNC_IMMEDIATE"
}
```

#### Asynchronous Acceptance (HTTP 202 Accepted):
Returned when `handshakeConfig.mode` is `ASYNC_CALLBACK` or `ASYNC_POLLING`:
```json
{
  "correlationKey": "PAL-9001",
  "channelCode": "INBOUND_PALLET_CHANNEL",
  "status": "ACCEPTED",
  "state": "PENDING_CALLBACK",
  "allRulesPassed": true,
  "mode": "ASYNC_CALLBACK",
  "timeoutSeconds": 60
}
```

### 6.2 Fulfilling Asynchronous Callbacks
When the external system finishes its processing, it reports completion to `/callbacks`:

```bash
curl -X POST http://localhost:8086/api/v1/wes/integration/callbacks \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: PAL-9001" \
  -d '{
    "status": "SUCCESS",
    "allocatedLocation": "BIN-A-01-04",
    "notes": "Dimension check verified by floor scanner"
  }'
```

---

## 7. Diagnostic & Debugging Runbook

### Error Diagnostic Decision Matrix

| HTTP Status | Primary Cause | Log Message Signature | Resolution Action |
| :--- | :--- | :--- | :--- |
| **`422 Unprocessable Entity`** | Business rule violation (e.g. SKU missing, overweight, regex mismatch) | `Rule 'XYZ' failed. Transitioning transaction state to 'REJECTED_...'` | Check `ruleEvaluationResults` in response body. Ensure master data entity exists or payload values conform to validation rules. |
| **`400 Bad Request`** | Correlation key missing in callback, or malformed JSON/XML | `Correlation key must be provided in X-Correlation-ID header or JSON body` | Provide `X-Correlation-ID` header or `correlationKey` attribute in body. |
| **`404 Not Found`** | Unknown channel code | `Integration channel not found: XYZ` | Call `GET /api/v1/wes/integration/channels` to verify exact channel code spelling. |
| **`408 Request Timeout`** | Asynchronous handshake timed out without receiving callback | `Handshake Session 'CORR-...' expired after Xs` | Check target system connectivity or increase `handshakeConfig.timeoutSeconds`. |

### Step-by-Step Rule Failure Diagnosis
When an ingestion request returns `422 Unprocessable Entity`, inspect the JSON response:

```json
{
  "correlationKey": "PAL-9001",
  "channelCode": "INBOUND_PALLET_CHANNEL",
  "status": "REJECTED",
  "state": "QUARANTINE_UNKNOWN_SKU",
  "allRulesPassed": false,
  "failedRule": {
    "ruleId": "CHK_SKU_MASTER",
    "errorMessage": "SKU does not exist in master catalog",
    "targetField": "skuCode",
    "actualValue": "SKU-BEVERAGE-01"
  }
}
```

**Resolution Steps**:
1. Check whether the item exists in the Master Catalog:
   ```bash
   curl -X GET http://localhost:8088/api/v1/wms/inventory/skus/SKU-BEVERAGE-01
   ```
2. If missing, register the SKU in WMS Master Data or adjust the mapping rule if the wrong payload attribute was mapped.
3. Once rectified, replay the payload to `/ingest`.
