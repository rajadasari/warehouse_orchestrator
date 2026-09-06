# Developer Environment & IDE Setup Guide

**DOCUMENT ID**: DEV-GUIDE-001  
**TARGET AUDIENCE**: Backend Developers, Frontend Developers, QA Engineers, Architects  
**SCOPE**: Setting up, building, running, and debugging the Warehouse Orchestrator platform inside an IDE (IntelliJ IDEA, VS Code, Eclipse/STS) during development and testing  
**RUNTIME**: Java 21 LTS, Spring Boot 3.3+, Node 20+, PostgreSQL 16+, Mosquitto MQTT 2.0+  

---

## 1. Quick Start Architecture Overview

The Warehouse Orchestrator monorepo contains:
1. **`common/`**: 6 shared utility and cross-cutting libraries:
   - `common-core`, `common-grpc` (Protobuf IDL & gRPC stubs), `common-security`, `common-logging`, `common-audit`, `common-industrial`.
2. **`services/`**: 7 decoupled Spring Boot microservices:
   - `gateway-service` (Port 8080)
   - `auth-service` (HTTP 8081 / gRPC 9091)
   - `wes-service` (HTTP 8082 / gRPC 9082)
   - `wms-service` (HTTP 8083 / gRPC 9093)
   - `wcs-service` (HTTP 8084 / gRPC 9094)
   - `asrs-wcs-service` (HTTP 8085 / gRPC 9095)
   - `fleet-service` (HTTP 8086 / gRPC 9096)
3. **`client/warehouse-ui/`**: Air-gapped React 18 + Vite frontend (Dev Server Port 5173).

During local development, you can run:
- **A Single Microservice** (e.g., developing only `auth-service` or `wes-service`).
- **A Subsystem Bundle** (e.g., `auth-service` + `gateway-service` + `client/warehouse-ui`).
- **The Full Platform** via IDE Compound Run Configurations.

---

## 2. Workstation Prerequisites

Ensure the following tools are installed on your workstation (Windows, macOS, or Linux):

| Tool | Minimum Version | Installation & Verification |
| :--- | :--- | :--- |
| **Java Development Kit (JDK)** | **21 LTS** (Eclipse Temurin or Amazon Corretto) | `java -version` & `javac -version` |
| **Apache Maven** | **3.9.x+** | `mvn -version` |
| **Node.js & npm** | **Node 20+ LTS / npm 10+** | `node -v` & `npm -v` |
| **PostgreSQL** | **16.x+** | `psql --version` (Running on port 5432) |
| **Eclipse Mosquitto** | **2.0.x+** | `mosquitto -v` (Running on port 1883) |
| **Git** | **2.40+** | `git --version` |

> [!TIP]
> **Recommended Developer Tools**:
> - **MQTTX** (GUI client for monitoring and publishing MQTT messages: `https://mqttx.app/`)
> - **Postman** or **Insomnia** (for REST API and gRPC testing)
> - **pgAdmin 4** or **DBeaver** (for visual database browsing)

---

## 3. Local Infrastructure Setup (Database & MQTT)

### 3.1. Initialize Local PostgreSQL Database
1. Connect to your local PostgreSQL instance as the `postgres` superuser (via `psql` or pgAdmin):
   ```bash
   psql -U postgres -h localhost -p 5432
   ```
2. Execute the initialization script:
   ```sql
   -- 1. Create the database
   CREATE DATABASE warehouse_db WITH ENCODING 'UTF8';
   
   -- 2. Connect to warehouse_db
   \c warehouse_db;
   
   -- 3. Install core extensions
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   
   -- 4. Create the shared application role
   CREATE ROLE warehouse_app WITH LOGIN PASSWORD 'warehouse_secure_pass_2026';
   
   -- 5. Create microservice bounded context schemas
   CREATE SCHEMA IF NOT EXISTS auth;
   CREATE SCHEMA IF NOT EXISTS wes;
   CREATE SCHEMA IF NOT EXISTS wms;
   CREATE SCHEMA IF NOT EXISTS wcs;
   CREATE SCHEMA IF NOT EXISTS asrs;
   CREATE SCHEMA IF NOT EXISTS fleet;
   
   -- 6. Grant privileges to warehouse_app
   GRANT ALL ON SCHEMA auth, wes, wms, wcs, asrs, fleet TO warehouse_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA auth, wes, wms, wcs, asrs, fleet GRANT ALL ON TABLES TO warehouse_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA auth, wes, wms, wcs, asrs, fleet GRANT ALL ON SEQUENCES TO warehouse_app;
   ```

### 3.2. Start Local Eclipse Mosquitto MQTT Broker
- **Windows**: Start the Windows Service via PowerShell:
  ```powershell
  Start-Service mosquitto
  # Or run standalone in foreground:
  mosquitto -v
  ```
- **Linux / macOS**:
  ```bash
  sudo systemctl start mosquitto
  # Or run standalone in foreground:
  mosquitto -v
  ```
- Verify broker is listening on port 1883:
  ```bash
  # Test with mosquitto_sub
  mosquitto_sub -h localhost -p 1883 -t "test/topic" -v
  ```

---

## 4. IDE Import & Configuration

### 4.1. IntelliJ IDEA (Recommended)

1. **Open the Project**:
   - Launch IntelliJ IDEA -> **Open**.
   - Navigate to the repository root directory (containing root `pom.xml`) and click **OK**.
   - Select **Open as Project**.

2. **Configure Project SDK**:
   - Go to `File -> Project Structure -> Project`.
   - Set **SDK** to **21 (Eclipse Temurin 21 or installed JDK 21)**.
   - Set **Language Level** to **21 - Records, Pattern matching, Virtual Threads**.

3. **Enable Annotation Processing (Mandatory for MapStruct & Lombok)**:
   - Go to `File -> Settings` (or `Preferences` on macOS) -> **Build, Execution, Deployment -> Compiler -> Annotation Processors**.
   - Check **Enable annotation processing**.
   - Set **Store generated sources relative to**: *Module content root*.

4. **Compile Protobuf & Generate gRPC Stubs**:
   - In IntelliJ, open the **Maven** tool window on the right.
   - Expand `Warehouse Orchestrator (Root) -> common -> common-grpc -> Plugins -> protobuf`.
   - Double click `protobuf:compile` and `protobuf:compile-custom`.
   - Or in terminal run:
     ```bash
     mvn clean compile -pl common/common-grpc
     ```
5. **Verify Generated Sources Root**:
   - In the Project explorer, locate `common/common-grpc/target/generated-sources/protobuf/java` and `grpc-java`.
   - Right-click both folders -> **Mark Directory as -> Generated Sources Root** (if not already blue).

---

### 4.2. Visual Studio Code (VS Code)

1. **Install Recommended Extensions**:
   - **Extension Pack for Java** (`vscjava.vscode-java-pack`)
   - **Spring Boot Extension Pack** (`vmware.vscode-spring-boot-pack`)
   - **Lombok Annotations Support for VS Code** (`glen/vscode-lombok`)

2. **Configure Workspace Settings (`.vscode/settings.json`)**:
   ```json
   {
     "java.configuration.runtimes": [
       {
         "name": "JavaSE-21",
         "path": "C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.x-hotspot",
         "default": true
       }
     ],
     "java.compile.nullAnalysis.mode": "automatic",
     "typescript.tsdk": "client/warehouse-ui/node_modules/typescript/lib"
   }
   ```

3. **Generate Protobuf Stubs**:
   Run in VS Code terminal:
   ```bash
   mvn clean compile -pl common/common-grpc
   ```

---

## 5. Development Environment Configuration (`dev` profile)

All services are configured to use Spring profiles. For local development, set active profile to `dev`:

### Common Environment Variables for Local Running
Set these environment variables in your IDE Run Configurations or OS shell:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=warehouse_db
DB_USERNAME=warehouse_app
DB_PASSWORD=warehouse_secure_pass_2026

# Mosquitto MQTT Configuration
MOSQUITTO_HOST=localhost
MOSQUITTO_PORT=1883
MOSQUITTO_TLS_PORT=8883

# Security Configuration
AUTH_MODE=LOCAL
JWT_EXPIRATION_HOURS=24
SPRING_PROFILES_ACTIVE=dev
```

---

## 6. Running Services in the IDE

### 6.1. Main Application Entrypoints

Each microservice has a standard Spring Boot `@SpringBootApplication` entry point:

| Microservice | Main Application Class | HTTP Port | gRPC Port |
| :--- | :--- | :--- | :--- |
| **`gateway-service`** | `com.company.warehouse.gateway.GatewayServiceApplication` | `8080` | N/A |
| **`auth-service`** | `com.company.warehouse.auth.AuthServiceApplication` | `8081` | `9091` |
| **`wes-service`** | `com.company.warehouse.wes.WesServiceApplication` | `8082` | `9082` |
| **`wms-service`** | `com.company.warehouse.wms.WmsServiceApplication` | `8083` | `9093` |
| **`wcs-service`** | `com.company.warehouse.wcs.WcsServiceApplication` | `8084` | `9094` |
| **`asrs-wcs-service`**| `com.company.warehouse.asrs.AsrsWcsServiceApplication` | `8085` | `9095` |
| **`fleet-service`** | `com.company.warehouse.fleet.FleetServiceApplication` | `8086` | `9096` |

### 6.2. Recommended Launch Order
When running multiple services locally, launch them in this dependency order:
1. **`auth-service`**: Initializes token verification and RSA JWKS keys.
2. **`wcs-service`**, **`asrs-wcs-service`**, **`fleet-service`**: Subsystem adapters and MQTT listeners.
3. **`wms-service`**, **`wes-service`**: Inventory and central wave orchestration.
4. **`gateway-service`**: Unified reverse proxy.

---

### 6.3. IntelliJ IDEA "Compound Run Configuration"
To start all services with a single click in IntelliJ:
1. Open **Run/Debug Configurations** (`Run -> Edit Configurations...`).
2. Create 7 Spring Boot or Application configurations (one for each service above).
3. Click the **+** icon in the top left and select **Compound**.
4. Name it **`All Warehouse Services`**.
5. Add all 7 configurations to the compound list.
6. Now select **`All Warehouse Services`** and press **Run** or **Debug**.

---

## 7. Running the Frontend UI in Development Mode

The React UI runs independently during development with hot module reloading (HMR) powered by Vite.

```bash
# 1. Navigate to UI directory
cd client/warehouse-ui

# 2. Install dependencies (offline-bundled @fontsource/inter, lucide-react)
npm install

# 3. Start Vite Development Server
npm run dev
```

- Local UI URL: **`http://localhost:5173`**
- During development, `vite.config.ts` automatically proxies API calls:
  - Requests to `/api/*` and `/auth/*` forward directly to Gateway at `http://localhost:8080`.

---

## 8. Testing & Debugging Workflows

### 8.1. Running Automated Tests in IDE
- **Unit Tests**: Right-click any test class under `src/test/java` -> **Run 'TestName'**.
- **Run all unit tests via Maven**:
  ```bash
  mvn test
  ```
- **Run tests for a single module**:
  ```bash
  mvn test -pl services/auth-service
  ```

### 8.2. Testing Endpoints via HTTP Clients
Create a `.http` file in your workspace or use IntelliJ HTTP Client / Postman:

#### Health Check Verification:
```http
### Check Gateway Health
GET http://localhost:8080/actuator/health

### Check Auth Service Health
GET http://localhost:8081/actuator/health

### Check WES Service Health
GET http://localhost:8082/actuator/health
```

#### Authentication & Login Test:
```http
### User Login (Local Mode)
POST http://localhost:8080/api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "TempIDP@2026!"
}
```

### 8.3. Testing gRPC Services Locally
Using `grpcurl` or Postman gRPC:
```bash
# List exposed gRPC services on WES Service (Port 9082)
grpcurl -plaintext localhost:9082 list

# Describe a specific method
grpcurl -plaintext localhost:9082 describe com.company.warehouse.grpc.MasterDataSyncService
```

### 8.4. Testing MQTT Topics Locally
Using Mosquitto CLI or MQTTX:
```bash
# Subscribe to AGV state topics (VDA 5050)
mosquitto_sub -h localhost -p 1883 -t "uagv/v2/+/state" -v

# Publish mock AGV heartbeat
mosquitto_pub -h localhost -p 1883 -t "uagv/v2/Plant01/AGV-01/state" -m '{"headerId":1,"timestamp":"2026-09-06T12:00:00Z","version":"2.0.0","manufacturer":"Standard","serialNumber":"AGV-01","batteryState":{"batteryCharge":95.5}}'
```

---

## 9. Troubleshooting Common Developer Setup Gotchas

### Issue 1: `Cannot resolve symbol 'com.company.warehouse.grpc.*'`
* **Cause**: Protobuf stubs have not been compiled or IDE has not indexed generated sources.
* **Fix**:
  1. Run `mvn clean compile -pl common/common-grpc` in terminal.
  2. Right click `common/common-grpc/target/generated-sources/protobuf/java` -> **Mark Directory as -> Generated Sources Root**.
  3. Right click `common/common-grpc/target/generated-sources/protobuf/grpc-java` -> **Mark Directory as -> Generated Sources Root**.
  4. Run `File -> Invalidate Caches / Restart` in IntelliJ.

### Issue 2: `java.net.BindException: Address already in use: bind`
* **Cause**: A previous JVM process or background service is occupying the port (e.g. 8080, 8081, 5432).
* **Fix**:
  - Windows:
    ```powershell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess | Stop-Process -Force
    ```
  - Linux / macOS:
    ```bash
    kill -9 $(lsof -t -i:8080)
    ```

### Issue 3: `Lombok annotations (@Getter, @Builder) not generating methods`
* **Cause**: Annotation processing is disabled in IDE settings.
* **Fix**:
  - In IntelliJ: `Settings -> Build, Execution, Deployment -> Compiler -> Annotation Processors` -> Check **Enable annotation processing**.
  - In VS Code: Install `Lombok Annotations Support for VS Code`.

### Issue 4: `PostgreSQL relation does not exist or schema not found`
* **Cause**: The application connected before the required schema (`auth`, `wes`, etc.) was created.
* **Fix**:
  - Verify that you ran the SQL script in [Section 3.1](#31-initialize-local-postgresql-database).
  - Ensure your `DB_USERNAME` user has `USAGE` and `CREATE` privileges on the target schema.
