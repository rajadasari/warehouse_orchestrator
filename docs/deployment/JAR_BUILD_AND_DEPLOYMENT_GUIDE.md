# Enterprise Deployment Guide: JAR Build, Staging, and Execution

This guide provides end-to-end instructions for building executable Spring Boot production JARs, staging them in designated directory paths, and deploying them on an on-premise industrial server (Windows or Linux).

---

## 1. Overview of Microservice Artifacts

The Warehouse Orchestrator platform consists of independent, self-contained Spring Boot microservices:

| Service Directory | Executable Production JAR | Default Port | Primary Purpose |
| :--- | :--- | :--- | :--- |
| `services/gateway-service` | `gateway-service.jar` | `8080` | API Gateway, SSL termination, reverse proxy |
| `services/auth-service` | `auth-service.jar` | `8085` | IAM, IEC 62443 Auth, Operator Passkeys |
| `services/wes-service` | `wes-service.jar` | `8081` | Warehouse Execution System & Wave Orchestration |
| `services/wms-service` | `wms-service.jar` | `8082` | Inventory Management, SKU tracking, Location mapping |
| `services/wcs-service` | `wcs-service.jar` | `8083` | Conveyor PLC routing & sensor data |
| `services/fleet-service` | `fleet-service.jar` | `8084` | AGV/AMR Fleet Dispatcher (VDA 5050 / MQTT) |
| `services/asrs-wcs-service` | `asrs-wcs-service.jar`| `8086` | High-Bay ASRS automated crane kinematics |

---

## 2. Generating JARs and Storing in a Specific Path

### Method A: Automated Build & Staging Script (Recommended)

An automated PowerShell script is provided to compile, package, and copy the executable JARs to any target path with canonical names.

#### Command: Build All Microservices & Stage to `C:\warehouse-platform\bin`
```powershell
Set-Location "C:\Users\Windows10\Documents\GitHub\Warehouse_orchestrator"
.\scripts\build_and_stage_jars.ps1 -DestinationPath "C:\warehouse-platform\bin"
```

#### Command: Build a Specific Service (e.g. `auth-service`)
```powershell
.\scripts\build_and_stage_jars.ps1 -Service auth -DestinationPath "C:\warehouse-platform\bin"
```

#### Expected Outcome:
```text
============================================================
 WAREHOUSE ORCHESTRATOR - JAR BUILD & STAGING PIPELINE
============================================================
 Target Directory : C:\warehouse-platform\bin
 Target Service   : auth

[SETUP] Creating target directory: C:\warehouse-platform\bin
[BUILD] Running Maven clean package (skip tests)...
Packaging module: services/auth-service...
[INFO] Scanning for projects...
[INFO] Building jar: ...\target\auth-service-1.0.0-SNAPSHOT.jar
[INFO] Replacing main artifact with repackaged archive...
[INFO] BUILD SUCCESS
[STAGE] Staging executable JARs to: C:\warehouse-platform\bin

============================================================
 STAGED PRODUCTION JARS SUMMARY
============================================================

Service      Canonical        SizeMB   TargetPath                                
-------      ---------        ------   ----------                                
auth-service auth-service.jar 83.50 MB C:\warehouse-platform\bin\auth-service.jar

Deployment Ready! Run services from 'C:\warehouse-platform\bin' using:
  java -jar "C:\warehouse-platform\bin\auth-service.jar"
============================================================
```

---

### Method B: Manual Maven Commands (Platform-Agnostic)

If you prefer building manually via standard Maven commands:

#### Step 1: Build the Whole Project
Run from the repository root:
```bash
mvn clean package -DskipTests
```
* **Expected Outcome**:
  ```text
  [INFO] ------------------------------------------------------------------------
  [INFO] BUILD SUCCESS
  [INFO] ------------------------------------------------------------------------
  [INFO] Total time:  01:25 min
  ```

#### Step 2: Build Only an Individual Service (e.g., Auth Service)
```bash
mvn clean package -pl services/auth-service -am -DskipTests
```
* **Expected Output Artifact**:
  `services/auth-service/target/auth-service-1.0.0-SNAPSHOT.jar` (approx. 80–90 MB, containing all embedded dependencies and Tomcat server).

#### Step 3: Copy to Target Destination

**On Windows (PowerShell):**
```powershell
# Create destination directory
New-Item -ItemType Directory -Path "C:\warehouse-platform\bin" -Force

# Copy and rename to canonical production file
Copy-Item ".\services\auth-service\target\auth-service-1.0.0-SNAPSHOT.jar" `
          -Destination "C:\warehouse-platform\bin\auth-service.jar" -Force
```

**On Linux (Bash):**
```bash
# Create destination directory
sudo mkdir -p /opt/warehouse/bin

# Copy and rename to canonical production file
sudo cp services/auth-service/target/auth-service-1.0.0-SNAPSHOT.jar \
        /opt/warehouse/bin/auth-service.jar
sudo chmod 755 /opt/warehouse/bin/auth-service.jar
```

#### Step 4: Verify JAR Integrity
Confirm the staged JAR contains the Spring Boot loader manifest:
```powershell
# Check size (must be > 70MB for a fat executable JAR)
Get-Item "C:\warehouse-platform\bin\auth-service.jar" | Select-Object Name, Length, LastWriteTime
```
* **Expected Outcome**:
  ```text
  Name             Length   LastWriteTime
  ----             ------   -------------
  auth-service.jar 87559407 06-09-2026 17:40:00
  ```

---

## 3. How to Deploy and Run Using the Staged JAR

### Step 1: Verify System Prerequisites

1. **Verify Java 17+**:
   ```powershell
   java -version
   ```
   * **Expected Outcome**:
     ```text
     openjdk version "17.0.x" (or 21.0.x)
     OpenJDK Runtime Environment (build 17.0.x+...)
     ```
2. **Verify PostgreSQL is Running**:
   ```powershell
   Get-Service -Name "postgresql*"
   ```
   * **Expected Outcome**: `Status: Running`

---

### Step 2: Day-0 Master Admin Commissioning

Before starting the web application, commission the master administrator credentials:

```powershell
.\scripts\onprem\init_admin.ps1 -NewPassword "Admin@Master2026!"
```
* **Expected Outcome**:
  ```text
  [COMMISSIONING] Initializing Master Administrator Account:
    Facility       : FAC-BLR-01
    Master Username: admin
    One-Time Key   : Admin@Master2026!
    Status         : Force Password Change = TRUE (Mandatory on 1st Login)

  [APPLY TO DATABASE] Executing SQL via psql...
  UPDATE 1
  [SUCCESS] Master Admin password updated in PostgreSQL.
  ```

---

### Step 3: Run the Service

#### Option A: Direct Foreground Run (For Verification / Testing)
Run the service directly in a terminal window:

```powershell
java -Xms512m -Xmx1024m `
     -jar "C:\warehouse-platform\bin\auth-service.jar" `
     --spring.profiles.active=prod `
     --server.port=8085
```

* **Expected Outcome (Console Logs)**:
  ```text
    .   ____          _            __ _ _
   /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
  ( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
   \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
    '  |____| .__|_| |_|_| |_\__, | / / / /
   =========|_|==============|___/=/_/_/_/
   :: Spring Boot ::                (v3.3.3)

  2026-09-06 17:45:00.120  INFO 1234 --- [auth-service] c.c.w.a.AuthApplication : Starting AuthApplication v1.0.0-SNAPSHOT
  2026-09-06 17:45:02.450  INFO 1234 --- [auth-service] o.f.c.i.database.base.DatabaseType : Database: PostgreSQL 17.x
  2026-09-06 17:45:03.110  INFO 1234 --- [auth-service] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8085 (http) with context path '/'
  2026-09-06 17:45:03.150  INFO 1234 --- [auth-service] c.c.w.a.AuthApplication : Started AuthApplication in 3.450 seconds
  ```

---

#### Option B: Resilient Background Process (PowerShell Background Task)
To launch the JAR in the background without keeping the terminal window open:

```powershell
$logPath = "C:\warehouse-platform\logs\auth-service.log"
New-Item -ItemType Directory -Path "C:\warehouse-platform\logs" -Force | Out-Null

Start-Process java -ArgumentList "-Xms512m -Xmx1024m -jar C:\warehouse-platform\bin\auth-service.jar --server.port=8085" `
                   -RedirectStandardOutput $logPath `
                   -RedirectStandardError $logPath `
                   -WindowStyle Hidden
```

* **To verify background process is running**:
  ```powershell
  Get-Process java | Select-Object Id, ProcessName, WorkingSet64
  ```

---

#### Option C: Enterprise Windows Service (NSSM - Auto-Start on System Boot)
For true 24/7 industrial production where the service starts automatically on server reboot:

1. Download **NSSM** (Non-Sucking Service Manager) to `C:\warehouse-platform\tools\nssm.exe`.
2. Install the Windows Service:
   ```powershell
   C:\warehouse-platform\tools\nssm.exe install warehouse-auth `
       "C:\Program Files\Java\jdk-17\bin\java.exe" `
       "-Xms512m -Xmx1024m -jar C:\warehouse-platform\bin\auth-service.jar --server.port=8085"
   
   # Configure auto-restart and logging
   C:\warehouse-platform\tools\nssm.exe set warehouse-auth AppStdout "C:\warehouse-platform\logs\auth-stdout.log"
   C:\warehouse-platform\tools\nssm.exe set warehouse-auth AppStderr "C:\warehouse-platform\logs\auth-stderr.log"
   C:\warehouse-platform\tools\nssm.exe set warehouse-auth Start SERVICE_AUTO_START

   # Start the service
   Start-Service warehouse-auth
   ```
* **Expected Outcome**:
  ```powershell
  Get-Service warehouse-auth
  # Status: Running
  ```

---

#### Option D: Linux Systemd Daemon (Linux Bare Metal)
Create `/etc/systemd/system/warehouse-auth.service`:
```ini
[Unit]
Description=Warehouse Orchestrator - Auth Service (IEC 62443)
After=syslog.target network.target postgresql.service

[Service]
Type=simple
User=warehouse
Group=warehouse
ExecStart=/usr/bin/java -Xms512m -Xmx1024m -jar /opt/warehouse/bin/auth-service.jar --server.port=8085
SuccessExitStatus=143
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```
Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable warehouse-auth
sudo systemctl start warehouse-auth
sudo systemctl status warehouse-auth
```

---

## 4. Post-Deployment Verification

### 1. Verify Health Endpoint
```powershell
Invoke-RestMethod -Uri "http://localhost:8085/actuator/health"
```
* **Expected Outcome**:
  ```json
  {
    "status": "UP"
  }
  ```

### 2. Verify Port Listening
```powershell
Get-NetTCPConnection -LocalPort 8085 -State Listen | Select-Object LocalAddress, LocalPort, State
```
* **Expected Outcome**:
  ```text
  LocalAddress LocalPort State
  ------------ --------- -----
  0.0.0.0           8085 Listen
  ```

### 3. Verify Day-0 Master Admin Login
Open browser at `http://localhost:5173` (or API call via PowerShell):
```powershell
$body = @{
    username = "admin"
    password = "Admin@Master2026!"
    authMode = "CREDENTIALS"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "http://localhost:8085/api/v1/auth/login" `
                         -Method Post `
                         -Body $body `
                         -ContentType "application/json"

$res | Select-Object username, role, forcePasswordChange
```
* **Expected Outcome**:
  ```text
  username role       forcePasswordChange
  -------- ----       -------------------
  admin    ROLE_ADMIN                True
  ```
  *(The `forcePasswordChange = True` indicates that on the web UI, the user will be presented with the Mandatory Password Change modal to establish their private credentials).*

---

## 5. Troubleshooting Reference

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `no main manifest attribute in auth-service.jar` | Built as a thin library JAR without `spring-boot:repackage` | Ensure `spring-boot-maven-plugin` has the `<goal>repackage</goal>` execution (configured in root `pom.xml`). Rebuild with `mvn clean package`. |
| `JAR file is only ~70 KB` | Thin JAR output | Rebuild using `.\scripts\build_and_stage_jars.ps1` to ensure fat repackaged archive is copied. |
| `Port 8085 already in use` | Another instance is running | Run `Get-Process java` and terminate conflicting process via `Stop-Process -Id <PID>`. |
| `Connection refused: localhost:5432` | PostgreSQL is stopped | Start PostgreSQL service via `Start-Service postgresql*`. |
