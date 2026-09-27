# AI Configuration & Debugging API Reference

This documentation directory provides an operational manual, schema specification, and diagnostic troubleshooting runbook designed for **AI agents, automated integration harnesses, and control room automation engineers**.

Using these APIs, an AI agent can configure, validate (dry-run), deploy, execute, and troubleshoot warehouse integrations, industrial PLC communications, dynamic databases, and workflow pipelines **programmatically without manual UI interaction or source code recompilation**.

---

## 1. System Topology & Service Endpoints

The Warehouse Orchestration platform operates as a coordinated microservice architecture adhering to the Purdue Enterprise Reference Architecture (ISA-95 Level 2 & Level 3).

```
 +-------------------------------------------------------------------------------+
 |                              AI AGENT / LLM HARNESS                           |
 +-------------------------------------------------------------------------------+
        |                     |                       |                     |
        | HTTP (8086)         | HTTP (8087)           | HTTP (8086)         | HTTP (8086)
        v                     v                       v                     v
 +---------------+     +---------------+     +---------------+     +---------------+
 |  WES Service  |     |  WCS Service  |     | Master Data   |     | Dynamic DB    |
 |  Universal    |     |  OPC UA &     |     | & Resource    |     | Configuration |
 |  Channels     |     |  Station Line |     | OOP Studio    |     | Manager       |
 +---------------+     +---------------+     +---------------+     +---------------+
        |                     |                       |                     |
        v                     v                       v                     v
 External WMS/ERP/MES   Industrial PLCs         Equipment Digital    PostgreSQL Master
 (JSON/XML/SAP IDoc)    (opc.tcp://)            Twins & Methods      & Tenant DBs
```

### Default Network Ports & Base URLs

| Service | Port | Base REST URL | Core Responsibility |
| :--- | :--- | :--- | :--- |
| **WES Service** | `8086` | `http://localhost:8086/api/v1/wes` | Core execution, universal channels, workflows, resources |
| **WCS Service** | `8087` | `http://localhost:8087/api/v1/wcs` | Floor conveyor PLC communication, OPC UA clients/servers |
| **WMS Service** | `8088` | `http://localhost:8088/api/v1/wms` | Inventory, SKU catalog, bin locations, third-party sync |
| **Auth Service** | `8081` | `http://localhost:8081/api/v1/auth` | IEC 62443 user authentication & JWT tokens |
| **Warehouse UI** | `3000` | `http://localhost:3000` | Industrial HMI Single Page Application (Vite + React) |

---

## 2. Documentation Modules Guide

| Document | Description | Primary AI Use Case |
| :--- | :--- | :--- |
| **[01. Universal Integration & Channels](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/AI%20configuration/01_universal_integration_and_channels.md)** | Self-describing schema introspection, dynamic mapping rules, 5-tier rule engine, dry-run validation, universal ingress & callback gateway. | Ingesting third-party WMS/ERP/MES feeds (XML/JSON/IDoc), validating payloads against master data, and configuring handshakes. |
| **[02. WCS Industrial OPC UA Integration](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/AI%20configuration/02_wcs_opcua_industrial_integration.md)** | OPC UA client/server configurations, tag dictionaries, tag groups, conveyor station templates, workflow node composition, and runtime diagnostics. | Connecting conveyor PLCs, reading/writing sensor tags, building automated station sequences, and diagnosing PLC communications. |
| **[03. Database & Runtime Configuration](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/AI%20configuration/03_database_and_runtime_configuration.md)** | Introspecting and switching the active PostgreSQL database connection pool dynamically with pre-flight connection testing. | Disaster recovery, switching between tenant databases, or re-pointing services during maintenance windows. |
| **[04. Workflow Execution & Simulation](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/AI%20configuration/04_workflow_execution_and_simulation.md)** | Workflow definition management, execution modes (`REAL`, `SIMULATION`, `DRY_RUN`), triggering instances, correlation callbacks, and execution traces. | Running end-to-end dry-run simulations of physical workflows without activating physical conveyors or AS/RS cranes. |
| **[05. Resource & Entity Template Studio](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/AI%20configuration/05_resource_and_entity_template_studio.md)** | Object-Oriented resource templates, archetype registry, token management, explicit authorization triggers, and service method execution. | Managing device profiles, verifying OAuth2 tokens, and executing device service methods via Entity Composer. |

---

## 3. Standard AI Operational Workflow

When an AI agent is tasked with configuring or troubleshooting an integration or floor operation, it should follow this 4-step loop:

```
+-----------------------------------------------------------------------------------+
| 1. INTROSPECT                                                                     |
|    Query `/ai-schema` endpoints to fetch current capabilities, supported rules,  |
|    handshake modes, data types, and template schemas.                             |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. PRE-FLIGHT DRY-RUN (ZERO-RISK VALIDATION)                                      |
|    POST candidate configuration and sample payloads to `/validate` or `/test`.    |
|    Review returned compilation warnings, rule evaluations, and transformed JSON. |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 3. COMMIT CONFIGURATION                                                           |
|    POST/PUT the validated configuration to persistent repository.                 |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 4. RUNTIME VERIFICATION & DIAGNOSTICS                                             |
|    Trigger test execution in `SIMULATION` mode or inspect live telemetry via       |
|    `/runtime` or `/diagnostics` endpoints. If error occurs, check error tables.  |
+-----------------------------------------------------------------------------------+
```

---

## 4. Common Headers & Authentication

All WES and WCS management APIs accept standard JSON headers:

```http
Content-Type: application/json
Accept: application/json
X-Operator-Id: AI_AGENT_AUTONOMOUS
```

When calling asynchronous callbacks, correlation keys can be provided either in the payload body or as an HTTP header:
```http
X-Correlation-ID: CORR-9A3F12BC-2026
```
