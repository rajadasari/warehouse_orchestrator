# On-Premises Bare-Metal Deployment Guide (Zero-Docker)

**DOCUMENT ID**: DEP-001  
**TARGET PLATFORMS**: Windows Server 2019/2022 / Windows 10/11 Pro & Ubuntu 22.04/24.04 LTS / RHEL 9  
**ARCHITECTURE**: Multi-JVM Bare-Metal / Microservices (7 Spring Boot JARs + React UI)  
**INFRASTRUCTURE**: PostgreSQL 16+ (Multi-Schema), Eclipse Mosquitto 2.0+ (MQTT 5.0), Embedded Hazelcast 5.4+  
**COMPLIANCE**: IEC 62443 Industrial Security, 12-Factor App Configuration, ISA-95 Level 2/3  

> [!TIP]
> **Dedicated OS Runbooks Available**:
> For step-by-step commands from copying the raw `.jar` files to services running live, use the dedicated runbooks:
> - 🪟 **Windows Server**: [WINDOWS_BARE_METAL_DEPLOYMENT_RUNBOOK.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/deployment/WINDOWS_BARE_METAL_DEPLOYMENT_RUNBOOK.md)
> - 🐧 **Linux (Ubuntu / RHEL)**: [LINUX_BARE_METAL_DEPLOYMENT_RUNBOOK.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/docs/deployment/LINUX_BARE_METAL_DEPLOYMENT_RUNBOOK.md)

---

## 1. Handover & Deployment Lifecycle

The deployment process follows a strict 7-phase operational runbook:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 0: Hardware & Pre-Flight Audit (CPU, RAM, Disk, Dual NICs)             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Install Host Software Prerequisites (Java 21, PostgreSQL 16, MQTT) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Initialize Database Cluster & Schemas (warehouse_db + 6 schemas)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Assemble Production Artifacts (JARs, UI Bundle, Certs)             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Deploy Directory Tree & 12-Factor Secrets (platform.env)           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Configure Host Daemons (Windows Services via WinSW / Linux systemd)│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: Phased Sequential Startup & Actuator Health Verification           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Server Sizing & Port Allocations

### 2.1. Physical Sizing Matrix
* **CPU**: Minimum 8 Cores (Intel Xeon / AMD EPYC $\ge$ 2.6 GHz).
* **RAM**: 32 GB ECC RAM minimum (Calculated for 7 concurrent JVMs + PostgreSQL + OS cache).
* **Storage**: Minimum 500 GB NVMe / Enterprise SSD.
* **Network**: Dual NICs (NIC 1: IT / Web / Scanners; NIC 2: Industrial OT LAN).

### 2.2. Network Firewall Port Allocation Table
| Port | Protocol | Binding | Service | Direction / Target |
| :--- | :--- | :--- | :--- | :--- |
| **8080 / 443** | HTTPS / WSS | `0.0.0.0` (IT LAN) | `gateway-service` | Inbound from Web UI, Scanners, Supervisors |
| **8883** | MQTTS (mTLS) | `0.0.0.0` (OT LAN) | `Eclipse Mosquitto` | Inbound from AGVs (VDA 5050), IoT Sensors |
| **4840** | OPC UA TCP | `0.0.0.0` (OT LAN) | `wcs` / `asrs` | Outbound to Siemens/Rockwell PLCs |
| **5432** | TCP | `127.0.0.1` only | `PostgreSQL 16` | Internal database connections |
| **8081–8086** | HTTP | `127.0.0.1` only | Microservices REST | Internal reverse proxy dispatch |
| **9091–9096** | gRPC (HTTP/2)| `127.0.0.1` only | Microservices gRPC | Internal high-speed binary RPC |
| **5701** | TCP | `127.0.0.1` only | Embedded Hazelcast | In-memory cache ring |

---

## 3. Phase-by-Phase Deployment Steps

### Phase 1: Install Software Prerequisites on OS

#### 1.1. Java 21 LTS Installation
Install **Eclipse Temurin OpenJDK 21**:
* **Windows**: Run the `.msi` installer. Enable *"Set JAVA_HOME"* and *"Add to PATH"*.
* **Linux**:
  ```bash
  sudo apt install -y wget apt-transport-https
  sudo mkdir -p -m 755 /etc/apt/keyrings
  wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo tee /etc/apt/keyrings/adoptium.asc
  echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | sudo tee /etc/apt/sources.list.d/adoptium.list
  sudo apt update && sudo apt install -y temurin-21-jdk
  ```
Verify: `java -version` returns `openjdk version "21.x"`.

#### 1.2. PostgreSQL 16 Installation
* **Windows**: Run PostgreSQL 16 installer. Keep default port `5432`.
* **Linux**:
  ```bash
  sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
  sudo apt update && sudo apt install -y postgresql-16 postgresql-contrib-16
  ```

#### 1.3. Eclipse Mosquitto Installation
* **Windows**: Download and install Mosquitto from `mosquitto.org`. Set service startup to **Automatic**.
* **Linux**:
  ```bash
  sudo apt install -y mosquitto mosquitto-clients
  sudo systemctl enable mosquitto && sudo systemctl start mosquitto
  ```

---

### Phase 2: Initialize Database Cluster & Schemas

Connect to PostgreSQL via `psql` or pgAdmin as `postgres` superuser:

```sql
-- 1. Create Core Application Database
CREATE DATABASE warehouse_db WITH ENCODING 'UTF8';
\c warehouse_db;

-- 2. Create Core Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. Create Microservice Bounded Context Schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS wes;
CREATE SCHEMA IF NOT EXISTS wms;
CREATE SCHEMA IF NOT EXISTS wcs;
CREATE SCHEMA IF NOT EXISTS asrs;
CREATE SCHEMA IF NOT EXISTS fleet;

-- 4. Create Application User & Assign Privileges
CREATE ROLE warehouse_app WITH LOGIN PASSWORD 'warehouse_secure_pass_2026';

GRANT ALL ON SCHEMA auth, wes, wms, wcs, asrs, fleet TO warehouse_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, wes, wms, wcs, asrs, fleet GRANT ALL ON TABLES TO warehouse_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, wes, wms, wcs, asrs, fleet GRANT ALL ON SEQUENCES TO warehouse_app;
```

---

### Phase 3: Artifact Assembly & Build

From your development/build machine:

```powershell
# 1. Build all 7 backend Spring Boot JARs
mvn clean package -DskipTests

# 2. Build React UI bundle
cd client/warehouse-ui
npm install
npm run build
cd ../..
```

The compiled output artifacts:
* `services/gateway-service/target/gateway-service-1.0.0-SNAPSHOT.jar`
* `services/auth-service/target/auth-service-1.0.0-SNAPSHOT.jar`
* `services/wes-service/target/wes-service-1.0.0-SNAPSHOT.jar`
* `services/wms-service/target/wms-service-1.0.0-SNAPSHOT.jar`
* `services/wcs-service/target/wcs-service-1.0.0-SNAPSHOT.jar`
* `services/asrs-wcs-service/target/asrs-wcs-service-1.0.0-SNAPSHOT.jar`
* `services/fleet-service/target/fleet-service-1.0.0-SNAPSHOT.jar`
* `client/warehouse-ui/dist/` (Static UI files)

---

### Phase 4: Target Server File Layout & Configuration

Create the standardized deployment directory tree:
* **Windows**: `C:\warehouse-platform\`
* **Linux**: `/opt/warehouse-platform/`

```text
C:\warehouse-platform\
├── bin\                       # Spring Boot JARs
├── config\                    # External production configurations
│   ├── platform.env           # Secrets & Environment variables
│   └── application-prod.yml   # Common overrides
├── static-ui\                 # Extracted contents of client/warehouse-ui/dist
├── service-wrapper\           # WinSW daemon binaries & XML configs (Windows)
├── certs\                     # TLS & mTLS certificates
└── logs\                      # Application logs
```

#### Production Secrets File (`config/platform.env`):
```properties
# Database Connectivity
DB_HOST=localhost
DB_PORT=5432
DB_NAME=warehouse_db
DB_USERNAME=warehouse_app
DB_PASSWORD=warehouse_secure_pass_2026

# MQTT Mosquitto
MOSQUITTO_HOST=localhost
MOSQUITTO_PORT=1883
MOSQUITTO_TLS_PORT=8883

# Security & Keys
JWT_EXPIRATION_HOURS=24
AUTH_MODE=LOCAL
```

---

### Phase 5: Multi-JVM Service Management (Zero-Docker Daemons)

#### Multi-JVM Memory & GC Configuration
To prevent memory starvation on a 32 GB server, every service MUST launch with explicit memory bounds and **Generational ZGC**:

```text
COMMON JVM FLAGS:
-XX:+UseZGC -XX:+ZGenerational -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=C:\warehouse-platform\logs\dump.hprof
```

#### Heap Allocation per Service:
* `gateway-service.jar`: `-Xms256m -Xmx512m` (Port 8080)
* `auth-service.jar`: `-Xms512m -Xmx1024m` (Port 8081 / gRPC 9091)
* `wes-service.jar`: `-Xms1024m -Xmx2048m` (Port 8082 / gRPC 9092)
* `wms-service.jar`: `-Xms512m -Xmx1024m` (Port 8083 / gRPC 9093)
* `wcs-service.jar`: `-Xms512m -Xmx1024m` (Port 8084 / gRPC 9094)
* `asrs-wcs-service.jar`: `-Xms512m -Xmx1024m` (Port 8085 / gRPC 9095)
* `fleet-service.jar`: `-Xms512m -Xmx1024m` (Port 8086 / gRPC 9096)

---

#### Option A: Windows Deployment via WinSW (Windows Service Wrapper)

For each service (e.g. `wes-service`), download `WinSW.exe`, rename to `wes-service.exe`, and create `wes-service.xml`:

```xml
<service>
  <id>warehouse-wes</id>
  <name>Warehouse WES Service</name>
  <description>Warehouse Execution System &amp; Master Data Engine</description>
  <executable>java</executable>
  <arguments>-XX:+UseZGC -XX:+ZGenerational -Xms1024m -Xmx2048m -jar C:\warehouse-platform\bin\wes-service.jar --spring.config.additional-location=file:C:\warehouse-platform\config\application-prod.yml</arguments>
  <logpath>C:\warehouse-platform\logs</logpath>
  <log mode="roll-by-size">
    <sizeThreshold>52428800</sizeThreshold>
    <keepFiles>10</keepFiles>
  </log>
  <onfailure action="restart" delay="5 sec"/>
  <resetfailure>1 hour</resetfailure>
  <serviceaccount>
    <domain>LocalSystem</domain>
  </serviceaccount>
</service>
```

Install and start the service:
```powershell
C:\warehouse-platform\service-wrapper\wes-service.exe install
C:\warehouse-platform\service-wrapper\wes-service.exe start
```

---

#### Option B: Linux Deployment via `systemd`

Create `/etc/systemd/system/warehouse-wes.service`:

```ini
[Unit]
Description=Warehouse WES Service
After=network.target postgresql.service mosquitto.service

[Service]
Type=simple
User=warehouse
Group=warehouse
WorkingDirectory=/opt/warehouse-platform
EnvironmentFile=/opt/warehouse-platform/config/platform.env
ExecStart=/usr/bin/java -XX:+UseZGC -XX:+ZGenerational -Xms1024m -Xmx2048m -jar /opt/warehouse-platform/bin/wes-service.jar --spring.config.additional-location=file:/opt/warehouse-platform/config/application-prod.yml
Restart=always
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable warehouse-wes
sudo systemctl start warehouse-wes
```

---

### Phase 6: Phased Startup Sequence & Health Verification

To prevent race conditions during cold starts, start services in this exact order:

```text
1. Start PostgreSQL 16 & Mosquitto Broker
2. Start auth-service (Initializes RSA keys & Flyway auth schema)
   Verify: http://localhost:8081/actuator/health
3. Start wcs-service, asrs-wcs-service, and fleet-service (Connects to PLCs / MQTT)
   Verify: http://localhost:8084/actuator/health, 8085, 8086
4. Start wms-service & wes-service (Registers equipment, loads master data)
   Verify: http://localhost:8082/actuator/health, 8083
5. Start gateway-service (Serves UI on port 8080/443)
   Verify: http://localhost:8080/actuator/health
```

---

## 4. Day-2 Operations & Maintenance Runbook

### 4.1. Automated Daily Database Backup
Create a daily scheduled task (Windows Task Scheduler or Linux cron at 02:00 AM):

```bash
# Backs up the entire multi-schema cluster into one single compressed file
pg_dump -U warehouse_app -h localhost -d warehouse_db -Fc -f "C:\warehouse-platform\backups\warehouse_db_$(date +%Y%m%d_%H%M%S).dump"
```

### 4.2. Rolling Application Updates
To update a service without stopping the whole plant:
1. Stop the specific service: `systemctl stop warehouse-wms`
2. Replace `wms-service.jar` with the new version in `bin/`.
3. Start the service: `systemctl start warehouse-wms`
4. Verify health endpoint: `curl -f http://localhost:8083/actuator/health`
