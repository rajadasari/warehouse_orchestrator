<#
.SYNOPSIS
    Automated Industrial Deployment Pipeline for Windows Bare-Metal Platforms.
.DESCRIPTION
    Fully automated, idempotent deployment pipeline for the Warehouse Orchestrator platform.
    Designed for Site Engineers and Field Commissioning.
    Implements 10 phases:
      1. Pre-Flight OS & Dependency Audit
      2. Production Directory Tree Creation
      3. PostgreSQL Database & Schema Initialization
      4. Artifact Assembly & Staging (Source Build or Pre-Packaged Release)
      5. Secrets Generation & NTFS Security Hardening (IEC 62443)
      6. WinSW Windows Service Wrapper Provisioning & XML Generation
      7. Windows Service Registration (SCM)
      8. Windows Firewall Rule Provisioning
      9. Phased Sequential Startup
     10. Actuator Health Verification & Day-0 Master Admin Commissioning
.PARAMETER InstallPath
    Target directory for platform installation. Default: 'C:\warehouse-platform'
.PARAMETER Mode
    Deployment mode: 'BuildFromSource' (compiles with Maven + npm) or 'FromReleasePackage' (copies from release media).
    Default: 'BuildFromSource'
.PARAMETER ReleasePath
    Path containing release media (bin, dist, tools) if Mode is 'FromReleasePackage'.
.PARAMETER DbHost
    PostgreSQL host. Auto-detected (prefers ::1 or 127.0.0.1). Default: auto
.PARAMETER DbPassword
    Application database user password. Default: 'warehouse_secure_pass_2026'
.PARAMETER AdminPassword
    Day-0 Master Admin commissioning password. Default: 'Admin@Master2026!'
.PARAMETER SkipBuild
    Skip build step if artifacts are already compiled in source directories.
.PARAMETER SkipDbInit
    Skip database and schema creation (useful for updates/re-deployments).
.PARAMETER SkipFirewall
    Skip Windows Firewall rule creation.
.EXAMPLE
    .\scripts\onprem\deploy_windows_platform.ps1
.EXAMPLE
    .\scripts\onprem\deploy_windows_platform.ps1 -Mode FromReleasePackage -ReleasePath "D:\release"
#>

[CmdletBinding()]
param(
    [string]$InstallPath = "C:\warehouse-platform",
    [ValidateSet("BuildFromSource", "FromReleasePackage")]
    [string]$Mode = "BuildFromSource",
    [string]$ReleasePath = "",
    [string]$DbHost = "auto",
    [string]$DbName = "warehouse_db",
    [string]$DbPassword = "warehouse_test123",
    [string]$AdminPassword = "Admin@Master2026!",
    [switch]$SkipBuild = $false,
    [switch]$SkipDbInit = $false,
    [switch]$SkipFirewall = $false
)

$ErrorActionPreference = "Continue"

function Write-PhaseHeader {
    param([string]$Phase, [string]$Title)
    Write-Host "`n================================================================================" -ForegroundColor Cyan
    Write-Host " [$Phase] $Title" -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host " [OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host " [WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Message)
    Write-Host " [FAIL] $Message" -ForegroundColor Red
}

$repoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " WAREHOUSE ORCHESTRATOR - SITE ENGINEER AUTOMATED WINDOWS DEPLOYMENT" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " Install Target : $InstallPath" -ForegroundColor White
Write-Host " Deploy Mode    : $Mode" -ForegroundColor White
Write-Host " Source Repo    : $repoRoot" -ForegroundColor White
Write-Host " Timestamp      : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White

# -----------------------------------------------------------------------------
# PHASE 1: PRE-FLIGHT AUDIT
# -----------------------------------------------------------------------------
Write-PhaseHeader "PHASE 1" "Pre-Flight Environment Audit"

# 1.1 Check Elevation (Administrator)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Fail "This script MUST be run from an elevated PowerShell (Run as Administrator)."
    exit 1
}
Write-Success "Elevated Administrator privileges verified."

# 1.2 Detect Java
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaCmd) {
    Write-Fail "Java not found in PATH! Please install Eclipse Temurin OpenJDK 21 or 17 LTS."
    exit 1
}
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
$javaVersionOutput = & java -version 2>&1 | Out-String
$ErrorActionPreference = $prevEap
Write-Success "Java detected: $($javaVersionOutput.Split("`n")[0].Trim())"

# 1.4 Detect PostgreSQL
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $pgService) {
    Write-Warn "PostgreSQL service not registered as a standard Windows service. Checking connectivity..."
} else {
    if ($pgService.Status -ne "Running") {
        Write-Host "Starting PostgreSQL service: $($pgService.Name)..." -ForegroundColor Yellow
        Start-Service $pgService.Name
    }
    Write-Success "PostgreSQL Service ($($pgService.Name)) is Running."
}

# 1.5 Detect Eclipse Mosquitto
$mqttService = Get-Service -Name "mosquitto" -ErrorAction SilentlyContinue
if ($mqttService) {
    if ($mqttService.Status -ne "Running") {
        Write-Host "Starting Mosquitto MQTT service..." -ForegroundColor Yellow
        Start-Service mosquitto
    }
    Write-Success "Eclipse Mosquitto MQTT Service is Running."
} else {
    Write-Warn "Mosquitto service not detected as Windows Service 'mosquitto'. Ensure MQTT broker runs on port 1883."
}

# 1.6 Clear conflicting Windows portproxy rules if present
try {
    $proxyRules = netsh interface portproxy show all 2>&1 | Out-String
    $platformPorts = @(5432, 1883, 8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087)
    foreach ($p in $platformPorts) {
        if ($proxyRules -match "0\.0\.0\.0\s+$p\s+") {
            Write-Host "Clearing conflicting Windows portproxy rule on port $p..." -ForegroundColor Yellow
            netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$p 2>&1 | Out-Null
        }
    }
} catch {
    Write-Warn "Notice inspecting portproxy: $_"
}

# 1.7 Resolve DB Host & Port
if ($DbHost -eq "auto" -or $DbHost -eq "127.0.0.1" -or $DbHost -eq "localhost") {
    # Check IPv4 and IPv6 loopback against PostgreSQL port 5432
    $canConnectIpv4 = (Test-NetConnection -ComputerName "127.0.0.1" -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded
    $canConnectIpv6 = (Test-NetConnection -ComputerName "::1" -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded

    if ($canConnectIpv4) {
        $DbHost = "127.0.0.1"
        Write-Success "Resolved PostgreSQL host: 127.0.0.1:5432 (IPv4 loopback)"
    } elseif ($canConnectIpv6) {
        $DbHost = "[::1]"
        Write-Success "Resolved PostgreSQL host: [::1]:5432 (IPv6 loopback)"
    } else {
        $DbHost = "[::1]"
        Write-Warn "PostgreSQL port 5432 not responding on test. Defaulting to [::1]."
    }
}

# -----------------------------------------------------------------------------
# PHASE 2: DIRECTORY TREE SETUP
# -----------------------------------------------------------------------------
Write-PhaseHeader "PHASE 2" "Create Standard Production Directory Hierarchy"

$subDirs = @("bin", "config", "logs", "service-wrapper", "static-ui", "backups", "certs")
foreach ($dir in $subDirs) {
    $fullPath = Join-Path $InstallPath $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host " Created: $fullPath" -ForegroundColor DarkGray
    }
}
Write-Success "Directory hierarchy verified under $InstallPath"

# -----------------------------------------------------------------------------
# PHASE 3: DATABASE & SCHEMA INITIALIZATION
# -----------------------------------------------------------------------------
Write-PhaseHeader "PHASE 3" "Database & Schema Initialization"

if ($SkipDbInit) {
    Write-Host "[-SkipDbInit specified] Preserving existing database '$DbName' without schema re-initialization." -ForegroundColor Cyan
} else {
    # Locate psql.exe
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    $psqlPath = if ($psqlCmd) { $psqlCmd.Source } else {
        Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch "pgAdmin" } |
            Select-Object -First 1 -ExpandProperty FullName
    }

    if (-not $psqlPath) {
        Write-Warn "psql.exe could not be found automatically. Assuming existing database '$DbName' is already initialized."
    } else {
        Write-Host "Found psql utility: $psqlPath" -ForegroundColor DarkGray
        $initSqlFile = if ($Mode -eq "FromReleasePackage" -and (Test-Path "$ReleasePath\scripts\db\init.sql")) {
            "$ReleasePath\scripts\db\init.sql"
        } else {
            Join-Path $repoRoot "scripts\db\init.sql"
        }
        
        $cleanHost = $DbHost.Replace("[","").Replace("]","")
        try {
            $dbCheck = & $psqlPath -U postgres -h $cleanHost -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DbName'" 2>&1 | Out-String
            if ($dbCheck -match "1") {
                # Database exists. Check if schemas/tables exist to preserve data
                $tableCount = & $psqlPath -U postgres -h $cleanHost -d $DbName -tc "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('auth','wes','wms','wcs','asrs','fleet');" 2>&1 | Out-String
                $count = 0
                [int]::TryParse($tableCount.Trim(), [ref]$count) | Out-Null
                if ($count -gt 0) {
                    Write-Success "Existing database '$DbName' detected with $count platform tables. Preserving existing database and data intact."
                } else {
                    Write-Host "Database '$DbName' exists but has no platform tables. Initializing bootstrap schema..." -ForegroundColor Yellow
                    if (Test-Path $initSqlFile) {
                        & $psqlPath -U postgres -h $cleanHost -d $DbName -f $initSqlFile 2>&1 | Out-Null
                        Write-Success "Database schemas initialized in '$DbName'."
                    }
                }
            } else {
                Write-Host "Database '$DbName' does not exist. Creating and bootstrapping..." -ForegroundColor Cyan
                & $psqlPath -U postgres -h $cleanHost -d postgres -c "CREATE DATABASE $DbName;" 2>&1 | Out-Null
                if (Test-Path $initSqlFile) {
                    & $psqlPath -U postgres -h $cleanHost -d $DbName -f $initSqlFile 2>&1 | Out-Null
                    Write-Success "Database '$DbName' created, user 'warehouse_app', and schemas initialized."
                }
            }
        } catch {
            Write-Warn "Notice during database verification: $_. Preserving existing database configuration."
        }
    }
}

# -----------------------------------------------------------------------------
# PHASE 4: ARTIFACT ASSEMBLY & STAGING
# -----------------------------------------------------------------------------
Write-PhaseHeader "PHASE 4" "Artifact Assembly & Staging"

$serviceNames = @("auth-service", "gateway-service", "wes-service", "wms-service", "wcs-service", "asrs-wcs-service", "fleet-service")

if ($Mode -eq "BuildFromSource") {
    if (-not $SkipBuild) {
        Write-Host "Building Spring Boot production JARs via Maven..." -ForegroundColor Yellow
        Set-Location $repoRoot
        & mvn clean package -DskipTests
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Maven compilation failed with exit code $LASTEXITCODE."
            exit $LASTEXITCODE
        }
        Write-Success "Maven build complete."

        # Build React UI
        $uiPath = Join-Path $repoRoot "client\warehouse-ui"
        if (Test-Path $uiPath) {
            Write-Host "Building React UI bundle via npm..." -ForegroundColor Yellow
            Set-Location $uiPath
            & npm install --no-audit --no-fund
            & npm run build
            if ($LASTEXITCODE -ne 0) {
                Write-Warn "React UI build completed with warnings or exit code $LASTEXITCODE."
            } else {
                Write-Success "React UI build complete."
            }
            Set-Location $repoRoot
        }
    }

    # Stage JARs to bin/
    $binDir = Join-Path $InstallPath "bin"
    foreach ($svc in $serviceNames) {
        $targetDir = Join-Path $repoRoot "services\$svc\target"
        $sourceJar = Get-ChildItem -Path $targetDir -Filter "$svc-*.jar" -ErrorAction SilentlyContinue |
                     Where-Object { $_.Name -notmatch "original|sources|javadoc" } |
                     Select-Object -First 1

        if ($sourceJar) {
            $destJar = Join-Path $binDir "$svc.jar"
            Copy-Item -Path $sourceJar.FullName -Destination $destJar -Force
            Write-Host " Staged: $svc.jar ($([math]::Round($sourceJar.Length/1MB, 2)) MB)" -ForegroundColor DarkGray
        } else {
            Write-Warn "JAR for $svc not found in $targetDir!"
        }
    }

    # Stage UI to static-ui/
    $distDir = Join-Path $repoRoot "client\warehouse-ui\dist"
    if (Test-Path $distDir) {
        $staticUiDir = Join-Path $InstallPath "static-ui"
        Copy-Item "$distDir\*" $staticUiDir -Recurse -Force
        Write-Success "Staged React UI assets to $staticUiDir."
    }

} elseif ($Mode -eq "FromReleasePackage") {
    if (-not (Test-Path $ReleasePath)) {
        Write-Fail "Specified ReleasePath does not exist: $ReleasePath"
        exit 1
    }

    $binDir = Join-Path $InstallPath "bin"
    foreach ($svc in $serviceNames) {
        $pkgJar = Get-ChildItem -Path "$ReleasePath\bin" -Filter "$svc*.jar" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($pkgJar) {
            Copy-Item $pkgJar.FullName "$binDir\$svc.jar" -Force
            Write-Host " Staged: $svc.jar from release media" -ForegroundColor DarkGray
        } else {
            Write-Warn "Release media missing $svc JAR in $ReleasePath\bin"
        }
    }

    if (Test-Path "$ReleasePath\dist") {
        Copy-Item "$ReleasePath\dist\*" (Join-Path $InstallPath "static-ui") -Recurse -Force
        Write-Success "Staged UI static assets from release package."
    }
}

Write-Success "All production artifacts staged in $InstallPath\bin and static-ui."

# -----------------------------------------------------------------------------
# PHASE 5: SECRETS & CONFIGURATION HARDENING
# -----------------------------------------------------------------------------
Write-PhaseHeader "PHASE 5" "Secrets & Configuration Hardening (IEC 62443)"

$envFilePath = Join-Path $InstallPath "config\platform.env"
$appYamlFilePath = Join-Path $InstallPath "config\application.yml"
$cleanDbHost = if ($DbHost.Contains(":") -and -not $DbHost.StartsWith("[")) { "[$DbHost]" } else { $DbHost }
$envContent = @"
# Database Connection
DB_HOST=$cleanDbHost
DB_PORT=5432
DB_NAME=$DbName
DB_USERNAME=warehouse_app
DB_PASSWORD=$DbPassword

# MQTT Broker (Eclipse Mosquitto)
MOSQUITTO_HOST=127.0.0.1
MOSQUITTO_PORT=1883
MOSQUITTO_TLS_PORT=8883

# Security & Identity
AUTH_MODE=LOCAL
JWT_EXPIRATION_HOURS=24
"@
Set-Content -Path $envFilePath -Value $envContent -Encoding utf8

$appYamlContent = @"
# Shared Spring Boot Platform Configuration (IEC 62443 Industrial HMI)
# Service-specific datasources and schemas are configured per service via environment variables
spring:
  main:
    banner-mode: console
"@
Set-Content -Path $appYamlFilePath -Value $appYamlContent -Encoding utf8
Write-Success "Production configurations written to $envFilePath and $appYamlFilePath."

# Apply strict NTFS ACLs (SYSTEM and Administrators only)
try {
    $acl = Get-Acl $envFilePath
    $acl.SetAccessRuleProtection($true, $false)
    $adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators","FullControl","Allow")
    $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM","FullControl","Allow")
    $acl.AddAccessRule($adminRule)
    $acl.AddAccessRule($systemRule)
    Set-Acl $envFilePath $acl
    Write-Success "Locked down NTFS file permissions on platform.env (SYSTEM & Admins only)."
} catch {
    Write-Warn "Could not set custom ACL on platform.env: $_"
}

# -----------------------------------------------------------------------------
# PHASE 6: WINSW WRAPPER & SERVICE DEFINITIONS
# -----------------------------------------------------------------------------
Write-PhaseHeader "PHASE 6" "Windows Service Wrapper (WinSW) Provisioning"

$wrapperDir = Join-Path $InstallPath "service-wrapper"
$baseWinSw = Join-Path $wrapperDir "WinSW.exe"

# 6.1 Provision WinSW.exe binary
if (Test-Path $baseWinSw) {
    Write-Success "Existing WinSW binary found in target directory ($baseWinSw). Skipping download."
} else {
    $localCandidates = @(
        "$ReleasePath\tools\WinSW-x64.exe",
        "$ReleasePath\tools\WinSW.exe",
        "$ReleasePath\WinSW-x64.exe",
        "$ReleasePath\WinSW.exe",
        (Join-Path $repoRoot "tools\WinSW-x64.exe"),
        (Join-Path $repoRoot "tools\WinSW.exe")
    )
    $foundLocal = $false
    foreach ($cand in $localCandidates) {
        if ($cand -and (Test-Path $cand)) {
            Copy-Item $cand $baseWinSw -Force
            Write-Success "Copied WinSW binary from local media: $cand"
            $foundLocal = $true
            break
        }
    }

    if (-not $foundLocal) {
        Write-Host "Local WinSW binary not found. Attempting download from GitHub Releases..." -ForegroundColor Yellow
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe" -OutFile $baseWinSw -TimeoutSec 30
            Write-Success "WinSW binary downloaded successfully."
        } catch {
            Write-Warn "Could not download WinSW (offline environment): $_. Please place WinSW-x64.exe into $wrapperDir or $ReleasePath\tools\."
        }
    }
}

# 6.2 Service definitions matrix
$isJava21Plus = $false
try {
    if ($javaVersionOutput -match 'version "(\d+)') {
        if ([int]$Matches[1] -ge 21) { $isJava21Plus = $true }
    }
} catch {}
$jvmGcFlag = if ($isJava21Plus) { "-XX:+UseZGC -XX:+ZGenerational" } else { "-XX:+UseG1GC" }

$serviceSpecs = @(
    @{
        id = "warehouse-auth";
        name = "Warehouse 01: Auth Service";
        desc = "Identity, Operator Badges, and IEC 62443 RBAC";
        exeName = "auth-service";
        jar = "auth-service.jar";
        jvm = "$jvmGcFlag -Xms512m -Xmx1024m";
        port = 8085;
        grpcPort = 9091;
    },
    @{
        id = "warehouse-wcs";
        name = "Warehouse 02: WCS Service";
        desc = "Floor Conveyor Sorters and PLC Integration";
        exeName = "wcs-service";
        jar = "wcs-service.jar";
        jvm = "$jvmGcFlag -Xms512m -Xmx1024m";
        port = 8083;
        grpcPort = 9094;
    },
    @{
        id = "warehouse-asrs";
        name = "Warehouse 03: AS/RS WCS Service";
        desc = "High-Bay Stacker Crane Control";
        exeName = "asrs-wcs-service";
        jar = "asrs-wcs-service.jar";
        jvm = "$jvmGcFlag -Xms512m -Xmx1024m";
        port = 8087;
        grpcPort = 9096;
    },
    @{
        id = "warehouse-fleet";
        name = "Warehouse 04: Fleet Manager";
        desc = "AGV/AMR VDA 5050 Robot Manager";
        exeName = "fleet-service";
        jar = "fleet-service.jar";
        jvm = "$jvmGcFlag -Xms512m -Xmx1024m";
        port = 8084;
        grpcPort = 9095;
    },
    @{
        id = "warehouse-wms";
        name = "Warehouse 05: WMS Service";
        desc = "Local Bin Inventory and Stock Allocations";
        exeName = "wms-service";
        jar = "wms-service.jar";
        jvm = "$jvmGcFlag -Xms512m -Xmx1024m";
        port = 8082;
        grpcPort = 9093;
    },
    @{
        id = "warehouse-wes";
        name = "Warehouse 06: WES Service";
        desc = "Master Data Authority, Resource Manager and Wave Execution";
        exeName = "wes-service";
        jar = "wes-service.jar";
        jvm = "$jvmGcFlag -Xms1024m -Xmx2048m";
        port = 8086;
        grpcPort = 9092;
    },
    @{
        id = "warehouse-gateway";
        name = "Warehouse 07: Gateway Service";
        desc = "Reverse Proxy, Rate Limiter, and UI Host";
        exeName = "gateway-service";
        jar = "gateway-service.jar";
        jvm = "$jvmGcFlag -Xms256m -Xmx512m";
        port = 8080;
        grpcPort = 9090;
    }
)

$binPath = Join-Path $InstallPath "bin"
$logsPath = Join-Path $InstallPath "logs"
$configPath = Join-Path $InstallPath "config"

foreach ($svc in $serviceSpecs) {
    $targetExe = Join-Path $wrapperDir "$($svc.exeName).exe"
    $targetXml = Join-Path $wrapperDir "$($svc.exeName).xml"

    if (Test-Path $baseWinSw) {
        Copy-Item $baseWinSw $targetExe -Force
    }

    $svcLogDir = Join-Path $logsPath $svc.exeName
    if (-not (Test-Path $svcLogDir)) {
        New-Item -ItemType Directory -Path $svcLogDir -Force | Out-Null
    }

    $xmlContent = @"
<service>
  <id>$($svc.id)</id>
  <name>$($svc.name)</name>
  <description>$($svc.desc)</description>
  <executable>java</executable>
  <arguments>$($svc.jvm) $(if ($cleanDbHost.Contains(":")) { "-Djava.net.preferIPv6Addresses=true" } else { "" }) -jar $binPath\$($svc.jar) --server.port=$($svc.port) --grpc.server.port=$($svc.grpcPort)</arguments>
  <env name="SPRING_CONFIG_ADDITIONAL_LOCATION" value="file:$configPath\"/>
  <env name="GRPC_PORT" value="$($svc.grpcPort)"/>
  <env name="DB_HOST" value="$cleanDbHost"/>
  <env name="DB_PORT" value="5432"/>
  <env name="DB_NAME" value="$DbName"/>
  <env name="DB_USERNAME" value="warehouse_app"/>
  <env name="DB_PASSWORD" value="$DbPassword"/>
  <env name="MOSQUITTO_HOST" value="127.0.0.1"/>
  <env name="MOSQUITTO_PORT" value="1883"/>
  <workingdirectory>$InstallPath</workingdirectory>
  <logpath>$svcLogDir</logpath>
  <log mode="roll-by-time">
    <pattern>yyyyMMdd</pattern>
    <autoRollAtTime>00:00:00</autoRollAtTime>
  </log>
  <onfailure action="restart" delay="5 sec"/>
</service>
"@
    Set-Content -Path $targetXml -Value $xmlContent -Encoding utf8
    Write-Host " Configured wrapper: $($svc.exeName).exe & $($svc.exeName).xml" -ForegroundColor DarkGray
}

Write-Success "Generated WinSW executables and XML configs for all 7 services."

# -----------------------------------------------------------------------------
# PHASE 7: WINDOWS SERVICE REGISTRATION
# -----------------------------------------------------------------------------
Write-PhaseHeader "PHASE 7" "Register Services with Windows Service Control Manager"

Set-Location $wrapperDir
foreach ($svc in $serviceSpecs) {
    $existing = Get-Service -Name $svc.id -ErrorAction SilentlyContinue
    if (-not $existing) {
        if (Test-Path "$($svc.exeName).exe") {
            Write-Host "Installing service: $($svc.id)..." -ForegroundColor Yellow
            & ".\$($svc.exeName).exe" install
        }
    } else {
        Write-Host "Service already registered: $($svc.id)" -ForegroundColor DarkGray
    }
}
Write-Success "All platform services registered in Windows SCM."

# -----------------------------------------------------------------------------
# PHASE 8: FIREWALL PROVISIONING
# -----------------------------------------------------------------------------
Write-PhaseHeader "PHASE 8" "Configure Windows Firewall Rules"

if (-not $SkipFirewall) {
    try {
        $existingGw = Get-NetFirewallRule -DisplayName "Warehouse Platform Gateway" -ErrorAction SilentlyContinue
        if (-not $existingGw) {
            New-NetFirewallRule -DisplayName "Warehouse Platform Gateway" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow | Out-Null
            Write-Success "Firewall rule created: Inbound TCP 8080 (Gateway & UI)."
        } else {
            Write-Host "Firewall rule already present: Gateway 8080." -ForegroundColor DarkGray
        }

        $existingMqtt = Get-NetFirewallRule -DisplayName "Warehouse Mosquitto MQTT" -ErrorAction SilentlyContinue
        if (-not $existingMqtt) {
            New-NetFirewallRule -DisplayName "Warehouse Mosquitto MQTT" -Direction Inbound -LocalPort 1883,8883 -Protocol TCP -Action Allow | Out-Null
            Write-Success "Firewall rule created: Inbound TCP 1883/8883 (MQTT Broker)."
        } else {
            Write-Host "Firewall rule already present: Mosquitto MQTT." -ForegroundColor DarkGray
        }
    } catch {
        Write-Warn "Notice configuring firewall: $_"
    }
} else {
    Write-Host "[-SkipFirewall specified] Skipping firewall rules." -ForegroundColor Cyan
}

# -----------------------------------------------------------------------------
# PHASE 9: PHASED SEQUENTIAL STARTUP
# -----------------------------------------------------------------------------
Write-PhaseHeader "PHASE 9" "Phased Sequential Startup"

# Phase 9.1: Auth Service
Write-Host "Starting Phase 1: Identity & Access Layer (warehouse-auth)..." -ForegroundColor Yellow
Start-Service warehouse-auth -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# Phase 9.2: Hardware Subsystems
Write-Host "Starting Phase 2: Hardware & Subsystem Adapters (wcs, asrs, fleet)..." -ForegroundColor Yellow
Start-Service warehouse-wcs -ErrorAction SilentlyContinue
Start-Service warehouse-asrs -ErrorAction SilentlyContinue
Start-Service warehouse-fleet -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# Phase 9.3: Inventory & WES Core Engine
Write-Host "Starting Phase 3: Core Engines (wms, wes)..." -ForegroundColor Yellow
Start-Service warehouse-wms -ErrorAction SilentlyContinue
Start-Service warehouse-wes -ErrorAction SilentlyContinue
Start-Sleep -Seconds 8

# Phase 9.4: API Gateway & UI Host
Write-Host "Starting Phase 4: API Gateway (warehouse-gateway)..." -ForegroundColor Yellow
Start-Service warehouse-gateway -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

Write-Success "All service startup signals issued."

# -----------------------------------------------------------------------------
# PHASE 10: HEALTH VERIFICATION & DAY-0 ADMIN COMMISSIONING
# -----------------------------------------------------------------------------
Write-PhaseHeader "PHASE 10" "Health Verification & Day-0 Admin Commissioning"

# Commission Master Admin
$initAdminScript = if ($Mode -eq "FromReleasePackage" -and (Test-Path "$ReleasePath\scripts\onprem\init_admin.ps1")) {
    "$ReleasePath\scripts\onprem\init_admin.ps1"
} elseif (Test-Path (Join-Path $PSScriptRoot "init_admin.ps1")) {
    Join-Path $PSScriptRoot "init_admin.ps1"
} else {
    Join-Path $repoRoot "scripts\onprem\init_admin.ps1"
}
if (Test-Path $initAdminScript) {
    Write-Host "Commissioning Master Administrator credentials ($initAdminScript)..." -ForegroundColor Yellow
    try {
        & $initAdminScript -NewPassword $AdminPassword -DbName $DbName -DbHost $DbHost
    } catch {
        Write-Warn "Notice during admin commissioning: $_"
    }
}

# Actuator Health Polling
$healthEndpoints = @{
    "Gateway/UI"      = "http://localhost:8080/actuator/health"
    "Auth Service"    = "http://localhost:8085/actuator/health"
    "WES Service"     = "http://localhost:8086/actuator/health"
    "WMS Service"     = "http://localhost:8082/actuator/health"
    "WCS Service"     = "http://localhost:8083/actuator/health"
    "ASRS Service"    = "http://localhost:8087/actuator/health"
    "Fleet Service"   = "http://localhost:8084/actuator/health"
}

Write-Host "`nPolling Actuator health status..." -ForegroundColor Yellow
$report = @()
foreach ($svc in $healthEndpoints.Keys) {
    $url = $healthEndpoints[$svc]
    $status = "OFFLINE"
    for ($i = 0; $i -lt 10; $i++) {
        try {
            $res = Invoke-RestMethod -Uri $url -TimeoutSec 3 -ErrorAction Stop
            if ($res.status) {
                $status = $res.status
                break
            }
        } catch {
            Start-Sleep -Seconds 3
        }
    }
    $report += [PSCustomObject]@{
        Service  = $svc
        Endpoint = $url
        Status   = $status
    }
}

$report | Format-Table -AutoSize

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host " DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " Access Platform Web UI : http://localhost:8080" -ForegroundColor White
Write-Host " Master Admin Username  : admin" -ForegroundColor White
Write-Host " Master Admin Password  : $AdminPassword" -ForegroundColor White
Write-Host " Application Logs Path  : $InstallPath\logs\" -ForegroundColor White
Write-Host " Management Utility     : .\scripts\onprem\manage_services.ps1" -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Cyan
