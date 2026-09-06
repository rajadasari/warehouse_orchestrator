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
│   └── WinSW-x64.exe           <-- Offline Windows Service Wrapper binary
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
2. **PostgreSQL 16 running**: Windows Service `postgresql-x64-16` is `Running` on port `5432`.
   - Database `warehouse_db` created.
   - User `warehouse_app` created with full schema permissions.
3. **Eclipse Mosquitto running**: Windows Service `mosquitto` is `Running` on port `1883/8883`.
4. **Administrator Shell**: All PowerShell commands must be executed in an elevated **PowerShell (Run as Administrator)**.

---

## 2. Step-by-Step Deployment Procedure

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
    "Auth Service"    = "http://localhost:8081/actuator/health"
    "WES Service"     = "http://localhost:8082/actuator/health"
    "WMS Service"     = "http://localhost:8083/actuator/health"
    "WCS Service"     = "http://localhost:8084/actuator/health"
    "ASRS Service"    = "http://localhost:8085/actuator/health"
    "Fleet Service"   = "http://localhost:8086/actuator/health"
    "Gateway/UI"      = "http://localhost:8080/actuator/health"
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
You are now ready to log in with initial credentials (`admin` / `TempIDP@2026!`).

---

## 3. Day-2 Maintenance & JAR Upgrade Procedures

### 3.1 Upgrading an Individual Microservice JAR

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
Invoke-RestMethod -Uri "http://localhost:8082/actuator/health"
```

### 3.2 Stopping and Restarting All Platform Services

To perform a complete graceful shutdown or restart:

```powershell
# Graceful Shutdown (Reverse dependency order)
Stop-Service warehouse-gateway
Stop-Service warehouse-wes
Stop-Service warehouse-wms
Stop-Service warehouse-fleet
Stop-Service warehouse-asrs
Stop-Service warehouse-wcs
Stop-Service warehouse-auth

# Complete Startup (Forward dependency order)
Start-Service warehouse-auth
Start-Sleep -Seconds 5
Start-Service warehouse-wcs, warehouse-asrs, warehouse-fleet
Start-Sleep -Seconds 5
Start-Service warehouse-wms, warehouse-wes
Start-Sleep -Seconds 8
Start-Service warehouse-gateway
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
