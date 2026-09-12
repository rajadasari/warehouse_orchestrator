# Warehouse Orchestrator — End-to-End Offline Deployment Guide

**Document Target**: Site Reliability Engineers & Commissioning Technicians  
**Deployment Target**: Windows Server 2019/2022 / Windows 10/11 Pro (64-bit)  
**Database**: PostgreSQL 16 (`warehouse_test_db` / `warehouse_test123`)  
**Architecture**: Native Multi-JVM Bare-Metal (WinSW Windows Services, Zero Docker)  

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Part 1: Generating the Offline Release Bundle](#part-1-generating-the-offline-release-bundle)
3. [Part 2: Prerequisites on the Offline Target PC](#part-2-prerequisites-on-the-offline-target-pc)
4. [Part 3: Copying & Deploying the Release Bundle](#part-3-copying--deploying-the-release-bundle)
5. [Part 4: Verifying Service Health & Operation](#part-4-verifying-service-health--operation)
6. [Part 5: First User Login & Day-0 Access](#part-5-first-user-login--day-0-access)
7. [Part 6: Stopping Services & Decommissioning / Reset for Repeated Testing](#part-6-stopping-services--decommissioning--reset-for-repeated-testing)
8. [Day-2 Operations & Service Management](#day-2-operations--service-management)

---

## Overview & Architecture

The Warehouse Orchestrator platform is composed of 7 Spring Boot microservices and a React web user interface:

| Microservice | Function | Port |
| :--- | :--- | :--- |
| **`gateway-service`** | Edge Reverse Proxy, UI Host & Rate Limiting | `8080` |
| **`auth-service`** | Identity, Operator Badges, IEC 62443 RBAC & JWT | `8085` |
| **`wes-service`** | Central Wave Engine, Item Master & Pallet Travel | `8086` |
| **`wms-service`** | Local Bin Topology & Inventory Allocation | `8082` |
| **`wcs-service`** | Floor Conveyors, Diverts & Sorter PLC Integration | `8083` |
| **`asrs-wcs-service`** | High-Bay Stacker Crane Control | `8086` |
| **`fleet-service`** | AGV / AMR Fleet Manager (VDA 5050 Protocol) | `8084` |

---

## Part 1: Generating the Offline Release Bundle

Run this step on your **development or build machine** (where source code, Maven, Node.js, and internet connectivity are available).

### Step 1.1: Run the Automated Packager

Open PowerShell and navigate to the repository root:

```powershell
Set-Location "C:\Users\Windows10\Documents\GitHub\Warehouse_orchestrator"
.\scripts\package_release.ps1 -OutputPath "C:\release"
```

> **Tip**: If you already compiled your JARs and web UI, add `-SkipBuild` to assemble the bundle in seconds:
> ```powershell
> .\scripts\package_release.ps1 -OutputPath "C:\release" -SkipBuild
> ```

### Step 1.2: Verify the Release Bundle Contents

Check that `C:\release` contains all necessary offline assets:

```text
C:\release\
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
├── tools\                          <-- Offline Windows Service Wrapper
│   └── WinSW-x64.exe
├── scripts\                        <-- Automated deployment scripts
│   ├── db\
│   │   └── init.sql
│   └── onprem\
│       ├── deploy_windows_platform.ps1
│       ├── manage_services.ps1
│       └── init_admin.ps1
└── README_DEPLOY.txt               <-- Field reference instructions
```

---

## Part 2: Prerequisites on the Offline Target PC

Before copying or running the installer, ensure the following software is installed on the offline machine:

### 1. Java 21 LTS (or 17 LTS)
- Verify in an elevated PowerShell:
  ```powershell
  java -version
  ```
- Must report `64-Bit Server VM` and `JAVA_HOME` added to system `PATH`.

### 2. PostgreSQL 16
- Verify the Windows service is running:
  ```powershell
  Get-Service -Name "postgresql*"
  ```
- Standard port: `5432`.
- Default superuser: `postgres`.

### 3. Eclipse Mosquitto MQTT Broker
- Verify the service is running:
  ```powershell
  Get-Service -Name "mosquitto"
  ```
- Standard port: `1883` (TCP).

---

## Part 3: Copying & Deploying the Release Bundle

### Step 3.1: Copy the Release Folder to the Target PC
1. Copy the entire `C:\release` directory onto a USB flash drive or portable drive (e.g. `D:\release`).
2. Alternatively, copy it to the local drive of the target PC (e.g. `C:\release`).

### Step 3.2: Run the Deployment Script

Open **PowerShell as Administrator** (`Run as Administrator`) on the target PC and execute:

```powershell
Set-Location "C:\release"
.\scripts\onprem\deploy_windows_platform.ps1 -Mode FromReleasePackage -ReleasePath "C:\release"
```

*(If running directly from a USB drive mounted as `D:`, replace `"C:\release"` with `"D:\release"`)*

### What the Script Does Automatically (10 Phases):

1. **Pre-Flight Audit**: Verifies elevated Admin privileges, Java installation, and PostgreSQL/Mosquitto services.
2. **Directory Structure**: Creates `C:\warehouse-platform\` (`bin`, `config`, `logs`, `service-wrapper`, `static-ui`, `backups`).
3. **Database Initialization**:
   - Connects to PostgreSQL.
   - Automatically creates `warehouse_test_db` if it does not already exist.
   - Executes `scripts\db\init.sql` to configure user `warehouse_app` (password `warehouse_test123`) and create schemas (`auth`, `wes`, `wms`, `wcs`, `asrs`, `fleet`).
4. **Artifact Staging**: Copies all 7 `.jar` files to `C:\warehouse-platform\bin` and UI static assets to `static-ui`.
5. **Security & Secrets Hardening**: Generates `C:\warehouse-platform\config\platform.env` with strict NTFS permissions (accessible only by SYSTEM and Administrators).
6. **WinSW Service Wrapper**: Copies `tools\WinSW-x64.exe` locally and generates XML configurations for each service.
7. **Windows Service Registration**: Registers all 7 services in the Windows Service Control Manager (SCM).
8. **Firewall Rules**: Automatically creates Windows Defender Firewall inbound rules for TCP ports `8080` (Gateway/UI) and `1883` (MQTT).
9. **Phased Sequential Startup**: Launches services in architectural dependency order (`auth` -> `wcs`/`asrs`/`fleet` -> `wms`/`wes` -> `gateway`).
10. **Day-0 Commissioning**: Seeds the initial Master Administrator account (`admin`).

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
Launch any modern web browser (Chrome, Edge, Firefox) on the target machine or a connected network client:

```text
http://localhost:8080
```
*(Or `http://<TARGET_PC_IP>:8080` from another machine on the warehouse local network)*

### Step 5.2: Enter First Login Credentials

On the login page, enter the Day-0 Master Administrator credentials:

- **Username**: `admin`
- **Password**: `Admin@Master2026!`

*(If you passed a custom `-AdminPassword` during deployment, use that password instead).*

> [!NOTE]
> **How Default Admin Seeding Works Across Deployment:**
> 1. **`scripts/db/init.sql`** initializes database extensions, roles (`warehouse_app`), and schemas (`auth`, `wes`, `wms`, `wcs`, `asrs`, `fleet`). It does *not* create tables or insert users.
> 2. **`auth-service` startup (Flyway migration `V1__init_auth_schema.sql`)**: Automatically creates all `auth.*` tables and inserts the baseline `admin` record with role `ROLE_ADMIN` and mandatory `force_password_change = TRUE`.
> 3. **`scripts/onprem/init_admin.ps1` (Phase 10 of deployment)**: Updates the admin record with the commissioned password (`Admin@Master2026!` or your custom parameter) so you can log in immediately on Day-0.

### Step 5.3: Confirm Dashboard Access
Upon successful login:
1. You will be directed to the **Master Data & Warehouse Overview Dashboard**.
2. Verify that the **System Status Indicator** displays **Connected / Healthy**.
3. Access **User Management** (`/users`) to create operator badges and commissioning accounts for field staff according to IEC 62443 role definitions.

---

## Part 6: Stopping Services & Decommissioning / Reset for Repeated Testing

When testing deployments iteratively on the same development or staging PC, follow these procedures to stop services, unregister them from Windows, reset the database, and return the host to a clean slate.

### 6.1 Just Stopping All Services (Temporary Pause)
To temporarily halt all 7 services without deleting configuration or databases:

```powershell
# In an elevated PowerShell:
.\scripts\onprem\manage_services.ps1 -Action stop
```
Services stop gracefully in reverse dependency order (`gateway` ➔ `wes`/`wms` ➔ `fleet`/`asrs`/`wcs` ➔ `auth`).

To start them back up later:
```powershell
.\scripts\onprem\manage_services.ps1 -Action start
```

---

### 6.2 Full Decommissioning & Factory Reset (Automated Tool)
A dedicated reset tool is provided at `scripts/onprem/decommission_platform.ps1`.

Open an elevated **PowerShell (Run as Administrator)**:

```powershell
# Complete clean wipe: stops services, unregisters from Windows SCM,
# drops test database & role, removes firewall rules, and deletes C:\warehouse-platform
Set-Location "C:\Users\Windows10\Documents\GitHub\Warehouse_orchestrator"
.\scripts\onprem\decommission_platform.ps1 -DropDatabase -RemoveInstallDir
```

#### Available Parameters:
| Parameter | Default | Description |
| :--- | :--- | :--- |
| `-InstallPath` | `C:\warehouse-platform` | Path to platform installation folder |
| `-DbName` | `warehouse_test_db` | Database to drop when `-DropDatabase` is supplied |
| `-DropDatabase` | `$false` | Terminates active DB sessions and drops the DB and `warehouse_app` role |
| `-RemoveInstallDir` | `$false` | Recursively deletes `C:\warehouse-platform` (logs, jars, configs) |
| `-RemoveFirewallRules`| `$true` | Removes inbound rules for port 8080 and 1883 |

---

### 6.3 Manual Step-by-Step Decommissioning (If needed without scripts)

If you prefer to run manual commands to reset your test environment:

#### Step 1: Stop and delete all 7 Windows services
```powershell
$services = @("warehouse-gateway", "warehouse-wes", "warehouse-wms", "warehouse-fleet", "warehouse-asrs", "warehouse-wcs", "warehouse-auth")

# Stop services
foreach ($s in $services) { Stop-Service -Name $s -Force -ErrorAction SilentlyContinue }

# Delete service registrations from Windows SCM
foreach ($s in $services) { & sc.exe delete $s }
```

#### Step 2: Drop the Database & Application Role
```powershell
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe" # (adjust to your installed PostgreSQL path)

# Terminate connections
& $psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'warehouse_test_db' AND pid <> pg_backend_pid();"

# Drop DB and Role
& $psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS warehouse_test_db;"
& $psql -U postgres -d postgres -c "DROP ROLE IF EXISTS warehouse_app;"
```

#### Step 3: Remove Firewall Rules
```powershell
Remove-NetFirewallRule -DisplayName "Warehouse Platform Gateway" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Warehouse Mosquitto MQTT" -ErrorAction SilentlyContinue
```

#### Step 4: Delete the Platform Directory
```powershell
Remove-Item -Path "C:\warehouse-platform" -Recurse -Force
```

---

### 6.4 Re-running Fresh Deployment

Once decommissioned, you can immediately test fresh deployment from scratch:

```powershell
# Deploy again from source:
.\scripts\onprem\deploy_windows_platform.ps1

# Or deploy again from offline release media:
.\scripts\onprem\deploy_windows_platform.ps1 -Mode FromReleasePackage -ReleasePath "C:\release"
```

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
```

### Changing Database Credentials After Deployment
If you ever need to change the database credentials after installation:
1. Edit `C:\warehouse-platform\config\platform.env`.
2. Update `DB_NAME`, `DB_USERNAME`, or `DB_PASSWORD`.
3. Restart all services:
   ```powershell
   .\scripts\onprem\manage_services.ps1 -Action restart
   ```
