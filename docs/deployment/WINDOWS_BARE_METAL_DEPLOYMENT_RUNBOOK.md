# Windows Server Bare-Metal Deployment Runbook

**DOCUMENT ID**: RUNBOOK-WIN-001
**TARGET OS**: Windows Server 2019 / 2022 / Windows 10/11 Pro (64-bit)
**SCOPE**: From receiving compiled JARs to all 7 services running live as Windows Services
**ZERO DOCKER**: Native multi-JVM execution via Windows Service Wrapper (WinSW)

---

## 1. Release Package Structure & Prerequisites

### 1.1 What You Receive in the Deployment Package

When deploying on bare-metal, the engineering release package (e.g. from USB drive, internal artifact repository, or network share `D:\release\` or `C:\release\`) contains:

```text
D:\release\
├── bin\
│   ├── auth-service-*.jar
│   ├── gateway-service-*.jar
│   ├── wes-service-*.jar
│   ├── wms-service-*.jar
│   ├── wcs-service-*.jar
│   ├── asrs-wcs-service-*.jar
│   └── fleet-service-*.jar
├── tools\
│   ├── WinSW-x64.exe           <-- Offline Windows Service Wrapper binary
│   └── analyzer\               <-- Python Handshake & Station Tag Analysis Engine
│       ├── handshake_analyzer_server.py
│       ├── requirements.txt
│       └── start_analyzer.bat
├── dist\                       <-- Production React UI static web assets
│   ├── index.html
│   ├── assets\
│   └── favicon.svg
└── config\
    └── platform.env.template   <-- Template environment variables
```

### 1.2 Prerequisites Checklist

Before executing this runbook, verify on the target Windows machine:

1. **Java 21 LTS installed**: Open PowerShell and run `java -version`. Ensure it outputs OpenJDK 21 64-bit (`JAVA_HOME` added to System PATH).
2. **Python 3.10+ installed**: Open PowerShell and run `python --version` (for Analysis & Waveform Service on port 8095).
3. **PostgreSQL 16/17 running**: Windows Service `postgresql*` is `Running` on port `5432`.
   - Database `warehouse_db` created (or existing DB preserved).
   - User `warehouse_app` created with full schema permissions.
4. **Eclipse Mosquitto running**: Windows Service `mosquitto` is `Running` on port `1883/8883`.
5. **Administrator Shell**: All PowerShell commands must be executed in an elevated **PowerShell (Run as Administrator)**.

---

## 2. Automated Deployment Pipeline for Site Engineers (Recommended)

For rapid field commissioning, an idempotent end-to-end automation script is provided at `scripts/onprem/deploy_windows_platform.ps1`. This script automates all 10 phases: pre-flight checks, directory hierarchy, database initialization, artifact compilation and staging, secrets hardening, WinSW service wrapper configuration, Windows service registration, firewall configuration, sequential phased startup, and health monitoring.

### 2.1 Quick-Start: Build and Deploy from Repository Source
Open an elevated **PowerShell (Run as Administrator)** and run:
```powershell
Set-Location "C:\Users\Windows10\Documents\GitHub\Warehouse_orchestrator"
.\scripts\onprem\deploy_windows_platform.ps1
```

### 2.2 Air-Gapped / Production Release Media Deployment
When deploying from USB media or network share containing pre-compiled JARs and UI assets (e.g. `D:\release\`):
```powershell
Set-Location "C:\Users\Windows10\Documents\GitHub\Warehouse_orchestrator"
.\scripts\onprem\deploy_windows_platform.ps1 -Mode FromReleasePackage -ReleasePath "D:\release"
```

### 2.3 Day-2 Operational Management Utility
Site engineers can inspect, start, stop, restart, or follow live logs across all 7 services:
```powershell
# Check status of all 7 Windows Services & Actuators
.\scripts\onprem\manage_services.ps1 -Action status

# Graceful sequential startup
.\scripts\onprem\manage_services.ps1 -Action start

# Graceful shutdown (reverse dependency order)
.\scripts\onprem\manage_services.ps1 -Action stop

# Restart entire platform
.\scripts\onprem\manage_services.ps1 -Action restart

# Tail live log for a specific service (e.g. WES)
.\scripts\onprem\manage_services.ps1 -Action logs -Service wes
```

---

## 3. Manual Step-by-Step Deployment Procedure (Reference)

If performing each step manually or diagnosing individual components:

### Step 1: Create the Standard Production Directory Tree

Open an elevated **PowerShell (Run as Administrator)**:

```powershell
# Create root deployment directories
New-Item -ItemType Directory -Path "C:\warehouse-platform\bin" -Force
New-Item -ItemType Directory -Path "C:\warehouse-platform\config" -Force
New-Item -ItemType Directory -Path "C:\warehouse-platform\logs" -Force
New-Item -ItemType Directory -Path "C:\warehouse-platform\service-wrapper" -Force
New-Item -ItemType Directory -Path "C:\warehouse-platform\static-ui" -Force
New-Item -ItemType Directory -Path "C:\warehouse-platform\backups" -Force
New-Item -ItemType Directory -Path "C:\warehouse-platform\certs" -Force
```

---

### Step 2: Copy the JAR Files & UI Bundle into Place

Copy all JAR files from your release media (e.g., `D:\release\bin\`) into `C:\warehouse-platform\bin\`, normalizing versioned filenames to canonical service names:

```powershell
# Define source location
$SourceDir = "D:\release"

# Copy and standardize JAR filenames to canonical names
Copy-Item "$SourceDir\bin\auth-service*.jar"     "C:\warehouse-platform\bin\auth-service.jar" -Force
Copy-Item "$SourceDir\bin\wcs-service*.jar"      "C:\warehouse-platform\bin\wcs-service.jar" -Force
Copy-Item "$SourceDir\bin\asrs-wcs-service*.jar" "C:\warehouse-platform\bin\asrs-wcs-service.jar" -Force
Copy-Item "$SourceDir\bin\fleet-service*.jar"    "C:\warehouse-platform\bin\fleet-service.jar" -Force
Copy-Item "$SourceDir\bin\wms-service*.jar"      "C:\warehouse-platform\bin\wms-service.jar" -Force
Copy-Item "$SourceDir\bin\wes-service*.jar"      "C:\warehouse-platform\bin\wes-service.jar" -Force
Copy-Item "$SourceDir\bin\gateway-service*.jar"  "C:\warehouse-platform\bin\gateway-service.jar" -Force

# Verify that all 7 canonical JARs exist in bin
Get-ChildItem -Path "C:\warehouse-platform\bin\*.jar" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

# Copy the compiled React UI static web assets
Copy-Item "$SourceDir\dist\*" "C:\warehouse-platform\static-ui\" -Recurse -Force
```

---

### Step 3: Create Server Environment File (`platform.env`)

Create `C:\warehouse-platform\config\platform.env`:

```powershell
@'
# Database Connection
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=warehouse_db
DB_USERNAME=warehouse_app
DB_PASSWORD=CustomerSecureDBPass2026!

# MQTT Broker (Eclipse Mosquitto)
MOSQUITTO_HOST=127.0.0.1
MOSQUITTO_PORT=1883
MOSQUITTO_TLS_PORT=8883

# Security & Identity
AUTH_MODE=LOCAL
JWT_EXPIRATION_HOURS=24
'@ | Out-File -FilePath "C:\warehouse-platform\config\platform.env" -Encoding utf8
```

---

### Step 4: Lock Down NTFS File Permissions (IEC 62443 Security)

Prevent non-administrator users or guest accounts from reading passwords in `platform.env`:

```powershell
# Disable inheritance and grant read access strictly to SYSTEM and Administrators
$acl = Get-Acl "C:\warehouse-platform\config\platform.env"
$acl.SetAccessRuleProtection($true, $false)
$adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators","FullControl","Allow")
$systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM","FullControl","Allow")
$acl.AddAccessRule($adminRule)
$acl.AddAccessRule($systemRule)
Set-Acl "C:\warehouse-platform\config\platform.env" $acl
```

---

### Step 5: Configure Windows Service Wrapper (WinSW)

For air-gapped production setups, copy the bundled `WinSW-x64.exe` from your release package:

```powershell
# 1. Copy offline WinSW binary from release package
if (Test-Path "$SourceDir\tools\WinSW-x64.exe") {
    Copy-Item "$SourceDir\tools\WinSW-x64.exe" "C:\warehouse-platform\service-wrapper\WinSW.exe" -Force
} else {
    # Fallback if connected to internet
    Invoke-WebRequest -Uri "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe" -OutFile "C:\warehouse-platform\service-wrapper\WinSW.exe"
}

# 2. Replicate wrapper executable for each of the 7 services
$services = @("auth-service", "wcs-service", "asrs-wcs-service", "fleet-service", "wms-service", "wes-service", "gateway-service")
foreach ($s in $services) {
    Copy-Item "C:\warehouse-platform\service-wrapper\WinSW.exe" "C:\warehouse-platform\service-wrapper\$s.exe" -Force
}
```

Now generate the XML service definitions for each service:

#### 1. Auth Service (`auth-service.xml`)

```powershell
@'
<service>
  <id>warehouse-auth</id>
  <name>Warehouse 01: Auth Service</name>
  <description>Identity, Operator Badges, and IEC 62443 RBAC</description>
  <executable>java</executable>
  <arguments>-XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx1024m -jar C:\warehouse-platform\bin\auth-service.jar</arguments>
  <env name="SPRING_CONFIG_ADDITIONAL_LOCATION" value="file:C:\warehouse-platform\config\"/>
  <workingdirectory>C:\warehouse-platform</workingdirectory>
  <logpath>C:\warehouse-platform\logs</logpath>
  <log mode="roll-by-size"><sizeThreshold>52428800</sizeThreshold><keepFiles>5</keepFiles></log>
  <onfailure action="restart" delay="5 sec"/>
</service>
'@ | Out-File -FilePath "C:\warehouse-platform\service-wrapper\auth-service.xml" -Encoding utf8
```

#### 2. WCS Service (`wcs-service.xml`)

```powershell
@'
<service>
  <id>warehouse-wcs</id>
  <name>Warehouse 02: WCS Service</name>
  <description>Floor Conveyor Sorters & PLC Integration</description>
  <executable>java</executable>
  <arguments>-XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx1024m -jar C:\warehouse-platform\bin\wcs-service.jar</arguments>
  <env name="SPRING_CONFIG_ADDITIONAL_LOCATION" value="file:C:\warehouse-platform\config\"/>
  <workingdirectory>C:\warehouse-platform</workingdirectory>
  <logpath>C:\warehouse-platform\logs</logpath>
  <log mode="roll-by-size"><sizeThreshold>52428800</sizeThreshold><keepFiles>5</keepFiles></log>
  <onfailure action="restart" delay="5 sec"/>
</service>
'@ | Out-File -FilePath "C:\warehouse-platform\service-wrapper\wcs-service.xml" -Encoding utf8
```

#### 3. AS/RS WCS Service (`asrs-wcs-service.xml`)

```powershell
@'
<service>
  <id>warehouse-asrs</id>
  <name>Warehouse 03: AS/RS WCS Service</name>
  <description>High-Bay Stacker Crane Control</description>
  <executable>java</executable>
  <arguments>-XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx1024m -jar C:\warehouse-platform\bin\asrs-wcs-service.jar</arguments>
  <env name="SPRING_CONFIG_ADDITIONAL_LOCATION" value="file:C:\warehouse-platform\config\"/>
  <workingdirectory>C:\warehouse-platform</workingdirectory>
  <logpath>C:\warehouse-platform\logs</logpath>
  <log mode="roll-by-size"><sizeThreshold>52428800</sizeThreshold><keepFiles>5</keepFiles></log>
  <onfailure action="restart" delay="5 sec"/>
</service>
'@ | Out-File -FilePath "C:\warehouse-platform\service-wrapper\asrs-wcs-service.xml" -Encoding utf8
```

#### 4. Fleet Service (`fleet-service.xml`)

```powershell
@'
<service>
  <id>warehouse-fleet</id>
  <name>Warehouse 04: Fleet Manager</name>
  <description>AGV/AMR VDA 5050 Robot Manager</description>
  <executable>java</executable>
  <arguments>-XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx1024m -jar C:\warehouse-platform\bin\fleet-service.jar</arguments>
  <env name="SPRING_CONFIG_ADDITIONAL_LOCATION" value="file:C:\warehouse-platform\config\"/>
  <workingdirectory>C:\warehouse-platform</workingdirectory>
  <logpath>C:\warehouse-platform\logs</logpath>
  <log mode="roll-by-size"><sizeThreshold>52428800</sizeThreshold><keepFiles>5</keepFiles></log>
  <onfailure action="restart" delay="5 sec"/>
</service>
'@ | Out-File -FilePath "C:\warehouse-platform\service-wrapper\fleet-service.xml" -Encoding utf8
```

#### 5. WMS Service (`wms-service.xml`)

```powershell
@'
<service>
  <id>warehouse-wms</id>
  <name>Warehouse 05: WMS Service</name>
  <description>Local Bin Inventory & Stock Allocations</description>
  <executable>java</executable>
  <arguments>-XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx1024m -jar C:\warehouse-platform\bin\wms-service.jar</arguments>
  <env name="SPRING_CONFIG_ADDITIONAL_LOCATION" value="file:C:\warehouse-platform\config\"/>
  <workingdirectory>C:\warehouse-platform</workingdirectory>
  <logpath>C:\warehouse-platform\logs</logpath>
  <log mode="roll-by-size"><sizeThreshold>52428800</sizeThreshold><keepFiles>5</keepFiles></log>
  <onfailure action="restart" delay="5 sec"/>
</service>
'@ | Out-File -FilePath "C:\warehouse-platform\service-wrapper\wms-service.xml" -Encoding utf8
```

#### 6. WES Service (`wes-service.xml`)

```powershell
@'
<service>
  <id>warehouse-wes</id>
  <name>Warehouse 06: WES Service</name>
  <description>Master Data Authority, Resource Manager & Wave Execution</description>
  <executable>java</executable>
  <arguments>-XX:+UseZGC -XX:+ZGenerational -Xms1024m -Xmx2048m -jar C:\warehouse-platform\bin\wes-service.jar</arguments>
  <env name="SPRING_CONFIG_ADDITIONAL_LOCATION" value="file:C:\warehouse-platform\config\"/>
  <workingdirectory>C:\warehouse-platform</workingdirectory>
  <logpath>C:\warehouse-platform\logs</logpath>
  <log mode="roll-by-size"><sizeThreshold>52428800</sizeThreshold><keepFiles>5</keepFiles></log>
  <onfailure action="restart" delay="5 sec"/>
</service>
'@ | Out-File -FilePath "C:\warehouse-platform\service-wrapper\wes-service.xml" -Encoding utf8
```

#### 7. Gateway Service (`gateway-service.xml`)

```powershell
@'
<service>
  <id>warehouse-gateway</id>
  <name>Warehouse 07: Gateway Service</name>
  <description>Reverse Proxy, Rate Limiter, and UI Host</description>
  <executable>java</executable>
  <arguments>-XX:+UseZGC -XX:+ZGenerational -Xms256m -Xmx512m -jar C:\warehouse-platform\bin\gateway-service.jar</arguments>
  <env name="SPRING_CONFIG_ADDITIONAL_LOCATION" value="file:C:\warehouse-platform\config\"/>
  <workingdirectory>C:\warehouse-platform</workingdirectory>
  <logpath>C:\warehouse-platform\logs</logpath>
  <log mode="roll-by-size"><sizeThreshold>52428800</sizeThreshold><keepFiles>5</keepFiles></log>
  <onfailure action="restart" delay="5 sec"/>
</service>
'@ | Out-File -FilePath "C:\warehouse-platform\service-wrapper\gateway-service.xml" -Encoding utf8
```

---

### Step 6: Install All Windows Services

Register all 7 executables into the Windows Service Control Manager:

```powershell
cd C:\warehouse-platform\service-wrapper\
.\auth-service.exe install
.\wcs-service.exe install
.\asrs-wcs-service.exe install
.\fleet-service.exe install
.\wms-service.exe install
.\wes-service.exe install
.\gateway-service.exe install
```

---

### Step 7: Sequential Phased Startup

Start the services in the correct industrial dependency order:

```powershell
# Phase 1: Identity & Access Layer
Start-Service warehouse-auth
Start-Sleep -Seconds 5

# Phase 2: Hardware & Subsystems Adapters
Start-Service warehouse-wcs
Start-Service warehouse-asrs
Start-Service warehouse-fleet
Start-Sleep -Seconds 5

# Phase 3: Inventory & WES Core Engine
Start-Service warehouse-wms
Start-Service warehouse-wes
Start-Sleep -Seconds 8

# Phase 4: API Gateway & UI Host
Start-Service warehouse-gateway
```

---

### Step 8: Health Verification

Verify that all services report `UP` status:

```powershell
$ports = @{
    "Gateway/UI"      = "http://localhost:8080/actuator/health"
    "Auth Service"    = "http://localhost:8085/actuator/health"
    "WES Service"     = "http://localhost:8086/actuator/health"
    "WMS Service"     = "http://localhost:8082/actuator/health"
    "WCS Service"     = "http://localhost:8083/actuator/health"
    "ASRS Service"    = "http://localhost:8087/actuator/health"
    "Fleet Service"   = "http://localhost:8084/actuator/health"
}

foreach ($svc in $ports.Keys) {
    try {
        $res = Invoke-RestMethod -Uri $ports[$svc] -TimeoutSec 3
        Write-Host "$svc is ONLINE: $($res.status)" -ForegroundColor Green
    } catch {
        Write-Host "$svc FAILED to respond!" -ForegroundColor Red
    }
}
```

---

### Step 9: Configure Windows Firewall Rules

If operators or client terminals access the platform across the local plant LAN/VLAN:

```powershell
# Open Gateway port 8080 (Inbound HTTP/HTTPS)
New-NetFirewallRule -DisplayName "Warehouse Platform Gateway" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow

# (Optional) Open Mosquitto MQTT if external AGVs connect directly to this host
New-NetFirewallRule -DisplayName "Warehouse Mosquitto MQTT" -Direction Inbound -LocalPort 1883,8883 -Protocol TCP -Action Allow
```

Open a browser to: `http://localhost:8080` (or `https://<server-ip>:8080`).

#### Default Admin User Credentials:
- **Username**: `admin`
- **Password**: `Admin@Master2026!` *(Configured by `init_admin.ps1` in Phase 10; or custom password passed to `-AdminPassword`)*
- **Force Password Change**: Prompted upon first login (IEC 62443 requirement).

> [!NOTE]
> **Admin Seeding Flow**: `init.sql` creates database schemas and the `warehouse_app` role. When `auth-service` boots up, Flyway migration `V1__init_auth_schema.sql` creates the tables and inserts the `admin` record. Lastly, `init_admin.ps1` sets the active Day-0 password.

---

## 3. Day-2 Maintenance & Operational Procedures

### 3.1 Service Management Utility (`manage_services.ps1`)
The platform includes an operational utility at `scripts/onprem/manage_services.ps1`:

```powershell
# Check health across all 7 services & SCM:
.\scripts\onprem\manage_services.ps1 -Action status

# Graceful sequential startup:
.\scripts\onprem\manage_services.ps1 -Action start

# Graceful shutdown (reverse dependency order):
.\scripts\onprem\manage_services.ps1 -Action stop

# Restart platform:
.\scripts\onprem\manage_services.ps1 -Action restart

# Unregister services from Windows SCM:
.\scripts\onprem\manage_services.ps1 -Action uninstall

# Tail live log for a service (e.g., auth or wes):
.\scripts\onprem\manage_services.ps1 -Action logs -Service auth
```

### 3.2 Upgrading an Individual Microservice JAR

When a new patch or version of a specific service is released (e.g. `wes-service-1.0.1.jar`):

```powershell
# 1. Stop the target Windows service
Stop-Service warehouse-wes

# 2. Backup current running JAR
Copy-Item "C:\warehouse-platform\bin\wes-service.jar" "C:\warehouse-platform\backups\wes-service.jar.bak_$(Get-Date -Format 'yyyyMMddHHmm')"

# 3. Copy the new JAR over the existing canonical file
Copy-Item "D:\patches\wes-service-1.0.1.jar" "C:\warehouse-platform\bin\wes-service.jar" -Force

# 4. Start the Windows service
Start-Service warehouse-wes

# 5. Verify health check
Invoke-RestMethod -Uri "http://localhost:8086/actuator/health"
```

### 3.3 Log Inspection and Troubleshooting

Each service writes standard and error logs to `C:\warehouse-platform\logs\`:

- WinSW wrapper logs: `C:\warehouse-platform\logs\<service-name>.out.log` and `<service-name>.err.log`
- Live log tailing in PowerShell:
  ```powershell
  Get-Content -Path "C:\warehouse-platform\logs\wes-service.out.log" -Wait -Tail 50
  Get-Content -Path "C:\warehouse-platform\logs\auth-service.out.log" -Wait -Tail 50
  ```
- Windows Event Viewer: Event Viewer -> Windows Logs -> Application (Source: `warehouse-*`).

---

## 4. Decommissioning, Teardown & Factory Reset (Multi-Run Testing)

To test the deployment pipeline multiple times on the same machine from a clean state:

### 4.1 Automated Factory Reset Script
Use `scripts/onprem/decommission_platform.ps1` in an elevated **PowerShell (Run as Administrator)**:

```powershell
Set-Location "C:\Users\Windows10\Documents\GitHub\Warehouse_orchestrator"

# Safe Platform Binaries Reset (Database and data preserved):
.\scripts\onprem\decommission_platform.ps1 -RemoveInstallDir
```
This automatically:
1. Stops all 7 services in reverse order.
2. Unregisters all 7 services from Windows SCM.
3. Removes Windows Firewall inbound rules.
4. Deletes `C:\warehouse-platform` completely.
5. **Preserves the database (`warehouse_db`) and all warehouse data 100% intact.**

> **Note**: If you ever intentionally want to drop the database, you must supply both `-DropDatabase` and `-ForceDrop`.

### 4.2 Manual Reset Commands (Preserving Database)
```powershell
# 1. Stop all services
$services = @("warehouse-gateway", "warehouse-wes", "warehouse-wms", "warehouse-fleet", "warehouse-asrs", "warehouse-wcs", "warehouse-auth")
foreach ($s in $services) { Stop-Service -Name $s -Force -ErrorAction SilentlyContinue }

# 2. Unregister services from Windows SCM
foreach ($s in $services) { & sc.exe delete $s }

# 3. Remove Firewall Rules
Remove-NetFirewallRule -DisplayName "Warehouse Platform Gateway" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Warehouse Mosquitto MQTT" -ErrorAction SilentlyContinue

# 4. Clean up platform files (database remains untouched)
Remove-Item -Path "C:\warehouse-platform" -Recurse -Force -ErrorAction SilentlyContinue
```

Once decommissioned, you can immediately re-run:
```powershell
.\scripts\onprem\deploy_windows_platform.ps1
```
