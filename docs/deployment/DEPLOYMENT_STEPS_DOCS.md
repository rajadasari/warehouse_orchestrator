# Warehouse Orchestrator — End-to-End Offline Deployment Guide

**Document Target**: Site Reliability Engineers & Commissioning Technicians
**Deployment Target**: Windows Server 2019/2022 / Windows 10/11 Pro (64-bit)
**Database**: PostgreSQL 16/17 (`warehouse_db` / `warehouse_test123`) — *Existing Database Supported, Zero Data Loss*
**Architecture**: Native Multi-JVM Bare-Metal (WinSW Windows Services, Zero Docker)

---

## Table of Contents

1. [Overview &amp; Architecture](#overview--architecture)
2. [Part 1: Generating the Offline Release Bundle](#part-1-generating-the-offline-release-bundle)
3. [Part 2: Prerequisites on the Offline Target PC](#part-2-prerequisites-on-the-offline-target-pc)
4. [Part 3: Copying &amp; Deploying the Release Bundle](#part-3-copying--deploying-the-release-bundle)
5. [Part 4: Verifying Service Health &amp; Operation](#part-4-verifying-service-health--operation)
6. [Part 5: First User Login &amp; Day-0 Access](#part-5-first-user-login--day-0-access)
7. [Part 6: Stopping Services &amp; Decommissioning / Safe Platform Reset](#part-6-stopping-services--decommissioning--safe-platform-reset)
8. [Day-2 Operations &amp; Service Management](#day-2-operations--service-management)

---

## Overview & Architecture

The Warehouse Orchestrator platform is composed of 7 Spring Boot microservices, 1 Python telemetry analysis engine, and an air-gapped React web user interface:

| Microservice                   | Function                                          | Port     |
| :----------------------------- | :------------------------------------------------ | :------- |
| **`gateway-service`**  | Edge Reverse Proxy, UI Host & Rate Limiting       | `8080` |
| **`auth-service`**     | Identity, Operator Badges, IEC 62443 RBAC & JWT   | `8085` |
| **`wes-service`**      | Central Wave Engine, Item Master & Pallet Travel  | `8086` |
| **`wms-service`**      | Local Bin Topology & Inventory Allocation         | `8082` |
| **`wcs-service`**      | Floor Conveyors, Diverts & Sorter PLC Integration | `8083` |
| **`asrs-wcs-service`** | High-Bay Stacker Crane Control                    | `8087` |
| **`fleet-service`**    | AGV / AMR Fleet Manager (VDA 5050 Protocol)       | `8084` |
| **`analysis-service`** | PLC Handshake, Station Tags & Waveform Engine (Python FastAPI) | `8095` |

---

## Part 1: Generating the Offline Release Bundle

Run this step on your **development or build machine** (where source code, Maven, Node.js, and internet connectivity are available).

### Step 1.1: Run the Automated Packager

Open PowerShell and navigate to the repository root:

```powershell
Set-Location "C:\Users\Windows10\Documents\GitHub\Warehouse_orchestrator"
.\scripts\package_release.ps1 -OutputPath "C:\release"
```

> [!TIP]
> **Existing Database Mode**: The packager automatically defaults to `-DbName "warehouse_db"` and `-PreserveExistingDb $true`. If compiled JARs and web UI already exist in `target/` and `dist/`, add `-SkipBuild` to assemble the bundle in seconds:
>
> ```powershell
> .\scripts\package_release.ps1 -OutputPath "C:\release" -SkipBuild
> ```

### Step 1.2: Verify the Release Bundle Contents

Check that `C:\release` contains all necessary offline assets and root deployment helpers:

```text
C:\release\
├── deploy.ps1                      <-- One-click deployment runner (uses existing DB)
├── deploy.bat                      <-- Double-clickable batch runner for cmd
├── bin\                            <-- All 7 executable Spring Boot fat JARs
│   ├── asrs-wcs-service.jar
│   ├── auth-service.jar
│   ├── fleet-service.jar
│   ├── gateway-service.jar
│   ├── wcs-service.jar
│   ├── wes-service.jar
│   └── wms-service.jar
├── dist\                           <-- Production React UI assets
│   ├── index.html
│   └── assets\ (JS, CSS, Web Fonts)
├── tools\                          <-- Offline Windows Service Wrapper & Python Engine
│   ├── WinSW-x64.exe
│   └── analyzer\                   <-- Python Handshake & Station Tag Analysis Engine
│       ├── handshake_analyzer_server.py
│       ├── requirements.txt
│       └── start_analyzer.bat
├── scripts\                        <-- Automated deployment scripts
│   ├── db\
│   │   └── init.sql
│   └── onprem\
│       ├── deploy_windows_platform.ps1
│       ├── decommission_platform.ps1
│       ├── manage_services.ps1
│       └── init_admin.ps1
├── README_DEPLOY.txt               <-- Field reference text instructions
└── README_DEPLOY.md                <-- Field reference markdown documentation
```

---

## Part 2: Prerequisites on the Offline Target PC

Before copying or running the installer, ensure the following software is running on the target machine:

### 1. Java 21 LTS (or 17 LTS)

- Verify in an elevated PowerShell:
  ```powershell
  java -version
  ```
- Must report `64-Bit Server VM` and have `JAVA_HOME` in system `PATH`.

### 2. PostgreSQL 16 or 17

- Verify the Windows service is running:
  ```powershell
  Get-Service -Name "postgresql*"
  ```
- Standard port: `5432`.
- Target Database: `warehouse_db` (or your existing platform database).

### 3. Eclipse Mosquitto MQTT Broker

- Verify the service is running:
  ```powershell
  Get-Service -Name "mosquitto"
  ```
- Standard port: `1883` (TCP).

### 4. Python 3.10+ (for Telemetry & Handshake Analysis)

- Verify in an elevated PowerShell:
  ```powershell
  python --version
  ```
- Standard port: `8095` (proxied automatically through Gateway port `8080`).
- Dependencies: `fastapi`, `uvicorn`, `pydantic` (the deployment script verifies and installs these automatically from `tools\analyzer\requirements.txt`).

---

## Part 3: Copying & Deploying the Release Bundle

### Step 3.1: Copy the Release Folder to the Target PC

1. Copy the entire `C:\release` directory onto a USB flash drive or portable media (e.g. `D:\release`).
2. Alternatively, copy it directly to the local drive of the target PC (e.g. `C:\release`).

### Step 3.2: Run One-Click Deployment

Open **PowerShell as Administrator** (`Run as Administrator`) on the target PC and execute:

```powershell
Set-Location "C:\release"
.\deploy.ps1
```

*(Or simply double-click or run `deploy.bat` from Command Prompt)*

Alternatively, call the core deployment engine directly with custom parameters:

```powershell
.\scripts\onprem\deploy_windows_platform.ps1 -Mode FromReleasePackage -ReleasePath "C:\release" -DbName "warehouse_db" -SkipDbInit
```

### What the Script Does Automatically (10 Phases):

1. **Pre-Flight Audit**: Verifies elevated Admin privileges, Java 21/17 installation, and PostgreSQL/Mosquitto services.
2. **Directory Structure**: Creates `C:\warehouse-platform\` (`bin`, `config`, `logs`, `service-wrapper`, `static-ui`, `backups`, `certs`).
3. **Database Detection & Preservation (Zero Data Loss)**:
   - Connects to PostgreSQL.
   - Inspects existing database `warehouse_db`. When existing platform tables are detected or `-SkipDbInit` is supplied, skips schema creation and **preserves all existing data intact**.
   - If deploying to a completely blank database, runs `init.sql` to initialize required extensions and schemas.
4. **Artifact Staging**: Copies all 7 `.jar` files to `C:\warehouse-platform\bin` and UI static assets to `static-ui`.
5. **Security & Secrets Hardening**: Generates `C:\warehouse-platform\config\platform.env` pointing to `warehouse_db` with strict NTFS permissions (accessible only by SYSTEM and Administrators).
6. **WinSW Service Wrapper**: Provisions `WinSW-x64.exe` locally and generates service XML wrappers for all 7 microservices.
7. **Windows Service Registration**: Registers all 7 services in the Windows Service Control Manager (SCM).
8. **Firewall Rules**: Automatically creates Windows Defender Firewall inbound rules for TCP ports `8080` (Gateway/UI) and `1883` (MQTT).
9. **Phased Sequential Startup**: Launches services in architectural dependency order (`auth` -> `wcs`/`asrs`/`fleet` -> `wms`/`wes` -> `gateway`).
10. **Day-0 Health Verification & Admin Preservation**:
    - Polls Spring Boot Actuator endpoints until all 7 services report `UP`.
    - Detects if an active `admin` account already exists in the database. If so, preserves existing credentials without forced password overwrites.

---

## Part 4: Verifying Service Health & Operation

### 4.1: Check Service Status

Run the provided service management utility from PowerShell:

```powershell
.\scripts\onprem\manage_services.ps1 -Action status
```

Expected output:

```text
Service Id           Display Name                   Status   PID   Actuator Status
----------           ------------                   ------   ---   ---------------
warehouse-auth       Warehouse 01: Auth Service     Running  ...   UP
warehouse-wcs        Warehouse 02: WCS Service      Running  ...   UP
warehouse-asrs       Warehouse 03: AS/RS Service    Running  ...   UP
warehouse-fleet      Warehouse 04: Fleet Manager    Running  ...   UP
warehouse-wms        Warehouse 05: WMS Service      Running  ...   UP
warehouse-wes        Warehouse 06: WES Service      Running  ...   UP
warehouse-analysis   Warehouse 08: Analysis Service Running  ...   UP
warehouse-gateway    Warehouse 07: Gateway Service  Running  ...   UP
```

### 4.2: Inspect Live Logs

To tail logs for any service in real time:

```powershell
# Tail WES Service logs
.\scripts\onprem\manage_services.ps1 -Action logs -Service wes

# Tail Gateway logs
.\scripts\onprem\manage_services.ps1 -Action logs -Service gateway
```

Log files are also accessible on disk at:

```text
C:\warehouse-platform\logs\<service-name>.log
```

---

## Part 5: First User Login & Day-0 Access

### Step 5.1: Open the Application

Launch any modern web browser on the target machine or a connected network client:

```text
http://localhost:8080
```

*(Or `http://<TARGET_PC_IP>:8080` from another machine on the warehouse OT network)*

### Step 5.2: Enter Login Credentials

- **Existing Database**: Use your existing administrator username and password already present in the database.
- **Fresh Database**: Use the default commissioning credentials:
  - **Username**: `admin`
  - **Password**: `Admin@Master2026!` (or custom `-AdminPassword` supplied during deployment).

---

## Part 6: Stopping Services & Decommissioning / Safe Platform Reset

### 6.1 Temporary Service Pause (Keep Everything Intact)

To temporarily halt all 7 services without deleting configuration, binaries, or databases:

```powershell
.\scripts\onprem\manage_services.ps1 -Action stop
```

Services stop gracefully in reverse dependency order (`gateway` -> `wes`/`wms` -> `fleet`/`asrs`/`wcs` -> `auth`).

To start them back up later:

```powershell
.\scripts\onprem\manage_services.ps1 -Action start
```

---

### 6.2 Safe Platform Reset / Re-Deploy (Preserving Database & Data)

To update or reinstall platform binaries (`C:\warehouse-platform`) **WITHOUT affecting your database or data**:

```powershell
.\scripts\onprem\decommission_platform.ps1 -RemoveInstallDir
```

> [!IMPORTANT]
> **Database Safety Guarantee**:
>
> - Running `decommission_platform.ps1` (with or without `-RemoveInstallDir`) **NEVER** touches or deletes your database.
> - The database `warehouse_db`, all schemas (`auth`, `wes`, `wms`, `wcs`, `asrs`, `fleet`), users, and operational data remain **100% intact**.
> - Even if `-DropDatabase` is passed by accident, the script blocks execution with a safety warning and requires explicit `-ForceDrop` before any database drop can proceed.

#### `decommission_platform.ps1` Parameter Reference:

| Parameter                | Default                   | Description                                                               |
| :----------------------- | :------------------------ | :------------------------------------------------------------------------ |
| `-InstallPath`         | `C:\warehouse-platform` | Path to platform installation folder to remove                            |
| `-DbName`              | `warehouse_db`          | Target database name                                                      |
| `-RemoveInstallDir`    | `$false`                | Removes`C:\warehouse-platform` (binaries, wrappers, configs, logs)      |
| `-RemoveFirewallRules` | `$true`                 | Removes inbound firewall rules for ports 8080 and 1883                    |
| `-DropDatabase`        | `$false`                | **Protected**: Will be blocked unless `-ForceDrop` is also passed |
| `-ForceDrop`           | `$false`                | Explicit authorization required to drop database                          |

---

### 6.3 Re-deploying Platform After Safe Reset

After resetting platform binaries with `decommission_platform.ps1 -RemoveInstallDir`:

```powershell
# In release package root:
.\deploy.ps1
```

All services are re-provisioned and re-registered in Windows SCM, reconnecting directly to your existing `warehouse_db` with zero data loss.

---

## Day-2 Operations & Service Management

The `manage_services.ps1` script provides standard operational control:

```powershell
# Check status across all services
.\scripts\onprem\manage_services.ps1 -Action status

# Graceful restart of the entire platform
.\scripts\onprem\manage_services.ps1 -Action restart

# Graceful platform shutdown
.\scripts\onprem\manage_services.ps1 -Action stop

# Start all services in sequence
.\scripts\onprem\manage_services.ps1 -Action start

# Unregister services from Windows SCM
.\scripts\onprem\manage_services.ps1 -Action uninstall

# Live log streaming for a specific service
.\scripts\onprem\manage_services.ps1 -Action logs -Service auth
```

### Changing Database Connection Parameters

If PostgreSQL host or port changes after installation:

1. Edit `C:\warehouse-platform\config\platform.env`.
2. Update `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, or `DB_PASSWORD`.
3. Restart all services:
   ```powershell
   .\scripts\onprem\manage_services.ps1 -Action restart
   ```
