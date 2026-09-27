# OOP Resource & Entity Template Studio Guide

The **WES Resource & Entity Template Subsystem** treats warehouse hardware and software assets (AS/RS cranes, conveyors, AGVs/AMRs, barcode scanners, and external third-party software systems) as typed, object-oriented digital twin entities.

It enables AI agents to compose standardized templates from pre-built archetypes, validate configuration schemas, oversee OAuth2/API-Key token lifecycles, and dynamically execute device methods.

---

## 1. Object-Oriented Architecture

```
                       +-----------------------------+
                       |    Archetype Registry       |
                       |  (CONVEYOR, CRANE, AMR,     |
                       |   WMS_CLIENT, SCANNER)      |
                       +-----------------------------+
                                      |
                                      | Inherits standard schema
                                      v
                       +-----------------------------+
                       |   ResourceTemplateEntity    |
                       |  - Declared Properties      |
                       |  - Declared Methods         |
                       |  - Telemetry Tag Schemas    |
                       +-----------------------------+
                                      |
                                      | Instantiates concrete twin
                                      v
                       +-----------------------------+
                       |       ResourceEntity        |
                       |  - Specific IP / Port       |
                       |  - Credentials / Auth       |
                       |  - Token Manager Cache      |
                       |  - Live Status (ONLINE)     |
                       +-----------------------------+
                                      |
                         +------------+------------+
                         |                         |
                         v                         v
       POST /{id}/authorize             POST /{id}/methods/{name}/execute
   (Validates OAuth2 Token Cache)     (Dispatches action via Entity Composer)
```

---

## 2. API Endpoints Reference

Base Paths:
- Templates: `http://localhost:8086/api/v1/wes/resource-templates`
- Resources: `http://localhost:8086/api/v1/wes/resources`

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Archetypes** | `GET` | `/resource-templates/archetypes` | Lists base archetypes with default properties and capabilities. |
| **Template Validation** | `POST` | `/resource-templates/validate` | Pre-flight validation of candidate template schemas. |
| **Templates CRUD** | `GET` | `/resource-templates` | Lists all defined resource templates. |
| | `GET` | `/resource-templates/{code}` | Retrieves a single resource template. |
| | `POST` | `/resource-templates` | Creates a new resource template. |
| | `PUT` | `/resource-templates/{code}` | Updates an existing resource template. |
| | `DELETE` | `/resource-templates/{code}` | Deletes a resource template. |
| **Resources CRUD** | `GET` | `/resources` | Lists all registered resources (filterable by `type`, `category`, `status`). |
| | `GET` | `/resources/{resourceId}` | Retrieves a single resource. |
| | `POST` | `/resources` | Registers a new physical or software resource. |
| | `PUT` | `/resources/{resourceId}` | Updates an existing resource. |
| | `DELETE` | `/resources/{resourceId}` | Deletes a resource. |
| **Authentication** | `POST` | `/resources/{resourceId}/authorize` | Forces an immediate token acquisition/refresh test and caches token in memory. |
| | `GET` | `/resources/{resourceId}/token-status` | Inspects token validity, remaining TTL, and last error. |
| **Method Dispatch**| `POST` | `/resources/{resourceId}/methods/{methodName}/execute` | Executes an entity method via the Entity Service Dispatcher. |

---

## 3. Step 1: Discover Archetypes & Pre-flight Validate Template

### 3.1 Discover Archetypes
```bash
curl -X GET "http://localhost:8086/api/v1/wes/resource-templates/archetypes?category=EQUIPMENT" \
  -H "Accept: application/json"
```

### 3.2 Pre-flight Validate Candidate Template
```bash
curl -X POST http://localhost:8086/api/v1/wes/resource-templates/validate \
  -H "Content-Type: application/json" \
  -d '{
    "templateCode": "TPL_HIGH_SPEED_CONVEYOR",
    "name": "High Speed Roller Conveyor",
    "category": "EQUIPMENT",
    "type": "CONVEYOR",
    "requiredProperties": ["ip", "port", "lineSpeedMps"],
    "supportedMethods": ["START", "STOP", "E_STOP", "REVERSE"]
  }'
```

#### Validation Response:
```json
{
  "valid": true,
  "templateCode": "TPL_HIGH_SPEED_CONVEYOR",
  "errors": [],
  "warnings": []
}
```

---

## 4. Step 2: Register Concrete Resource Instance

Register an actual resource bound to the validated template:

```bash
curl -X POST http://localhost:8086/api/v1/wes/resources \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "CONV_ZONE_A_01",
    "name": "Conveyor Zone A - Primary Induction",
    "type": "CONVEYOR",
    "category": "EQUIPMENT",
    "protocol": "opc.tcp",
    "host": "192.168.10.51",
    "port": 4840,
    "status": "ACTIVE",
    "description": "Induction line conveyor for Zone A",
    "templateCode": "TPL_HIGH_SPEED_CONVEYOR",
    "customProperties": {
      "ip": "192.168.10.51",
      "port": 4840,
      "lineSpeedMps": 1.5,
      "maxLoadKg": 1500
    }
  }'
```

---

## 5. Step 3: External Software Client Auth Lifecycle

When registering external software systems (WMS, ERP, MES) that require **OAuth2 Bearer Tokens**, use the explicit authorization testing endpoints to verify credential validity.

### 5.1 Test & Force Token Acquisition
```bash
curl -X POST http://localhost:8086/api/v1/wes/resources/LOGIQS-AMBIENT-WMS/authorize
```

#### Successful Auth Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "status": {
    "resourceId": "LOGIQS-AMBIENT-WMS",
    "hasValidToken": true,
    "expiresInSeconds": 3540,
    "lastRefreshedAt": "2026-09-20T10:30:00Z",
    "lastError": null
  },
  "message": "Authorization successful! Token acquired and cached in memory."
}
```

### 5.2 Inspect Token Status
```bash
curl -X GET http://localhost:8086/api/v1/wes/resources/LOGIQS-AMBIENT-WMS/token-status
```

---

## 6. Step 4: Dispatching Dynamic Entity Methods

AI agents can execute actions directly against any registered resource through the unified method execution gateway:

```bash
curl -X POST http://localhost:8086/api/v1/wes/resources/CONV_ZONE_A_01/methods/START/execute \
  -H "Content-Type: application/json" \
  -d '{
    "targetSpeedMps": 1.2,
    "direction": "FORWARD"
  }'
```

#### Method Execution Result (`MethodExecutionResult`):
```json
{
  "success": true,
  "statusCode": 200,
  "resourceId": "CONV_ZONE_A_01",
  "methodName": "START",
  "executionDurationMs": 115,
  "outputParameters": {
    "currentMotorRpm": 1450,
    "state": "RUNNING"
  },
  "errorMessage": null
}
```

---

## 7. Diagnostic & Troubleshooting Runbook

### Resource Diagnostic Decision Matrix

| Issue | Root Cause | Debugging Action |
| :--- | :--- | :--- |
| **Auth Failure on `POST /authorize`** | Invalid client credentials, token endpoint unreachable, or incorrect `tokenResponseField`. | Check `GET /resources/{id}/token-status`. Verify `clientId`, `clientSecret`, and `tokenPath` against external system documentation. |
| **Method Execution Returns 404** | The requested `methodName` is not registered or supported by the resource template. | Call `GET /resource-templates/{templateCode}` to verify the list of `supportedMethods`. |
| **Method Execution Returns 500** | Target device driver threw a connection timeout or hardware error. | Inspect device IP reachability (`GET /resources/{id}/ip`) and check physical equipment safety interlocks. |
| **Validation Rejection on Template Save** | A required property defined in the archetype is missing from the template definition. | Review the archetype contract using `GET /resource-templates/archetypes`. |
