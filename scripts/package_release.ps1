<#
.SYNOPSIS
    Automated Offline Release Bundle Packager for Warehouse Orchestrator
.DESCRIPTION
    Compiles and packages all required components into a self-contained offline
    release bundle configured to use the existing database and preserve existing
    data, schemas, and credentials without data loss or re-initialization.
.PARAMETER OutputPath
    Destination directory where the release bundle will be created. Default: 'C:\release'
.PARAMETER SkipBuild
    Skip Maven and npm compilation (uses existing target/ and dist/ artifacts).
.PARAMETER DbName
    Existing PostgreSQL database name. Default: 'warehouse_db'
.PARAMETER DbHost
    PostgreSQL host. Default: 'localhost'
.PARAMETER DbUser
    PostgreSQL application user. Default: 'warehouse_app'
.PARAMETER DbPassword
    PostgreSQL application user password. Default: 'warehouse_test123'
.PARAMETER PreserveExistingDb
    Preserve existing database schema and data intact. Default: $true
.EXAMPLE
    .\scripts\package_release.ps1 -OutputPath "C:\release"
.EXAMPLE
    .\scripts\package_release.ps1 -OutputPath "D:\release" -SkipBuild
#>
[CmdletBinding()]
param(
    [string]$OutputPath = "C:\release",
    [switch]$SkipBuild = $false,
    [string]$DbName = "warehouse_db",
    [string]$DbHost = "localhost",
    [string]$DbUser = "warehouse_app",
    [string]$DbPassword = "warehouse_test123",
    [switch]$PreserveExistingDb = $true
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " WAREHOUSE ORCHESTRATOR - OFFLINE RELEASE BUNDLE PACKAGER" -ForegroundColor Cyan
Write-Host " (CONFIGURED FOR EXISTING DATABASE - ZERO DATA LOSS)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " Output Directory     : $OutputPath" -ForegroundColor White
Write-Host " Skip Build           : $SkipBuild" -ForegroundColor White
Write-Host " Target Database      : $DbName (Existing DB Preserved: $PreserveExistingDb)" -ForegroundColor Green
Write-Host " Database Host        : $DbHost" -ForegroundColor White
Write-Host " Database User        : $DbUser" -ForegroundColor White
Write-Host " Timestamp            : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Cyan

$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName

# Probe and audit existing database if PostgreSQL utility is accessible
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
$psqlPath = if ($psqlCmd) { $psqlCmd.Source } else {
    Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "pgAdmin" } |
        Select-Object -First 1 -ExpandProperty FullName
}

if ($psqlPath -and (Test-Path $psqlPath)) {
    try {
        $cleanHost = $DbHost.Replace("[","").Replace("]","")
        $dbCheck = & $psqlPath -U postgres -h $cleanHost -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DbName'" 2>&1 | Out-String
        if ($dbCheck -match "1") {
            $tableCount = & $psqlPath -U postgres -h $cleanHost -d $DbName -tc "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('auth','wes','wms','wcs','asrs','fleet');" 2>&1 | Out-String
            $tCount = 0
            [int]::TryParse($tableCount.Trim(), [ref]$tCount) | Out-Null
            Write-Host "[AUDIT] Verified existing database '$DbName' ($tCount platform tables present)." -ForegroundColor Green
            Write-Host "        Release package will connect to existing DB without modifying data or schema." -ForegroundColor Green
        } else {
            Write-Host "[INFO] Database '$DbName' not currently found on local host. It will be preserved if present at deployment." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[INFO] Could not query PostgreSQL host directly ($DbHost). Continuing packaging..." -ForegroundColor DarkGray
    }
}

# 1. Create target release folder hierarchy
$binDir = Join-Path $OutputPath "bin"
$distDir = Join-Path $OutputPath "dist"
$toolsDir = Join-Path $OutputPath "tools"
$scriptsDir = Join-Path $OutputPath "scripts"

foreach ($dir in @($binDir, $distDir, $toolsDir, $scriptsDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Host "`n[STEP 1/6] Release directory tree created under $OutputPath" -ForegroundColor Green

# 2. Build & Stage Spring Boot JARs
Write-Host "`n[STEP 2/6] Packaging Backend Services..." -ForegroundColor Yellow

if (-not $SkipBuild) {
    Write-Host " Running 'mvn clean package -DskipTests' across all modules..." -ForegroundColor Cyan
    Set-Location $repoRoot
    & mvn clean package -DskipTests
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[ERROR] Maven packaging failed with exit code $LASTEXITCODE!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host " Maven compilation completed successfully." -ForegroundColor Green
} else {
    Write-Host " Skipping Maven compilation (-SkipBuild). Staging existing target JARs..." -ForegroundColor Cyan
}

$serviceMappings = @{
    "auth-service"     = "auth-service.jar"
    "gateway-service"  = "gateway-service.jar"
    "wes-service"      = "wes-service.jar"
    "wms-service"      = "wms-service.jar"
    "wcs-service"      = "wcs-service.jar"
    "fleet-service"    = "fleet-service.jar"
    "asrs-wcs-service" = "asrs-wcs-service.jar"
}

$stagedJars = @()
foreach ($svcKey in $serviceMappings.Keys) {
    $targetDir = Join-Path $repoRoot "services\$svcKey\target"
    if (Test-Path $targetDir) {
        $sourceJar = Get-ChildItem -Path $targetDir -Filter "$svcKey-*.jar" |
                     Where-Object { $_.Name -notmatch "original|sources|javadoc" } |
                     Select-Object -First 1

        if ($sourceJar) {
            $destFileName = $serviceMappings[$svcKey]
            $destFile = Join-Path $binDir $destFileName
            Copy-Item -Path $sourceJar.FullName -Destination $destFile -Force
            $fileSizeMB = [math]::Round($sourceJar.Length / 1MB, 2)
            $stagedJars += [PSCustomObject]@{
                Component = $svcKey
                File      = $destFileName
                Size      = "$fileSizeMB MB"
                Status    = "Staged"
            }
        } else {
            Write-Host " [WARN] No JAR found in $targetDir for $svcKey" -ForegroundColor Yellow
        }
    } else {
        Write-Host " [WARN] Target folder $targetDir does not exist for $svcKey" -ForegroundColor Yellow
    }
}

# 3. Build & Stage React UI
Write-Host "`n[STEP 3/6] Packaging React Web UI..." -ForegroundColor Yellow
$uiSrc = Join-Path $repoRoot "client\warehouse-ui"

if (-not $SkipBuild) {
    if (Test-Path $uiSrc) {
        Write-Host " Building React UI bundle via 'npm run build'..." -ForegroundColor Cyan
        Set-Location $uiSrc
        & npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host " [WARN] React build finished with exit code $LASTEXITCODE." -ForegroundColor Yellow
        }
    }
}

$uiDist = Join-Path $uiSrc "dist"
if (Test-Path $uiDist) {
    Copy-Item -Path "$uiDist\*" -Destination $distDir -Recurse -Force
    Write-Host " React UI assets successfully staged to $distDir." -ForegroundColor Green
} else {
    Write-Host " [WARN] $uiDist not found. Please build the UI first or ensure dist exists." -ForegroundColor Yellow
}

# 4. Download WinSW-x64.exe for offline service wrapper
Write-Host "`n[STEP 4/6] Securing WinSW Service Wrapper binary for offline use..." -ForegroundColor Yellow
$winSwPath = Join-Path $toolsDir "WinSW-x64.exe"

if (-not (Test-Path $winSwPath)) {
    $existingWinSw = "C:\warehouse-platform\service-wrapper\WinSW.exe"
    if (Test-Path $existingWinSw) {
        Copy-Item $existingWinSw $winSwPath -Force
        Write-Host " Copied WinSW binary from local installation: $winSwPath" -ForegroundColor Green
    } else {
        Write-Host " Downloading WinSW-x64.exe v2.12.0 from GitHub..." -ForegroundColor Cyan
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe" -OutFile $winSwPath
            Write-Host " Downloaded WinSW-x64.exe successfully to $winSwPath." -ForegroundColor Green
        } catch {
            Write-Host " [WARN] Could not automatically download WinSW: $_" -ForegroundColor Yellow
            Write-Host " Please manually place WinSW-x64.exe into: $toolsDir" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host " WinSW-x64.exe already present in $toolsDir." -ForegroundColor Green
}

# 5. Stage Deployment & Database Scripts
Write-Host "`n[STEP 5/6] Staging Automation & Database Scripts..." -ForegroundColor Yellow
$srcScripts = Join-Path $repoRoot "scripts"
$targetDb = Join-Path $scriptsDir "db"
$targetOnprem = Join-Path $scriptsDir "onprem"
if (-not (Test-Path $targetDb)) { New-Item -ItemType Directory -Path $targetDb -Force | Out-Null }
if (-not (Test-Path $targetOnprem)) { New-Item -ItemType Directory -Path $targetOnprem -Force | Out-Null }
Copy-Item -Path "$srcScripts\db\*" -Destination $targetDb -Recurse -Force
Copy-Item -Path "$srcScripts\onprem\*" -Destination $targetOnprem -Recurse -Force

$requiredScripts = @(
    "deploy_windows_platform.ps1",
    "decommission_platform.ps1",
    "manage_services.ps1",
    "init_admin.ps1"
)
foreach ($s in $requiredScripts) {
    $sp = Join-Path $scriptsDir "onprem\$s"
    if (Test-Path $sp) {
        Write-Host " [OK] Staged: scripts/onprem/$s" -ForegroundColor Green
    } else {
        Write-Host " [WARN] Missing expected script: $s" -ForegroundColor Yellow
    }
}

# 5b. Stage Handshake Analysis Engine (Python FastAPI)
$srcDcsLogs = Join-Path $repoRoot "release\dcs_logs"
$targetToolsAnalyzer = Join-Path $toolsDir "analyzer"
if (Test-Path $srcDcsLogs) {
    if (-not (Test-Path $targetToolsAnalyzer)) { New-Item -ItemType Directory -Path $targetToolsAnalyzer -Force | Out-Null }
    Copy-Item -Path "$srcDcsLogs\*" -Destination $targetToolsAnalyzer -Recurse -Force
    Write-Host " [OK] Staged Handshake Analysis Engine into tools/analyzer" -ForegroundColor Green
}

# 6. Generate One-Click Deployment Launchers in release root
Write-Host "`n[STEP 6/6] Generating One-Click Deployment Launchers..." -ForegroundColor Yellow

$skipDbFlag = if ($PreserveExistingDb) { "-SkipDbInit" } else { "" }

$deployPs1Content = @"
<#
.SYNOPSIS
    One-Click Platform Deployment Launcher (Preserving Existing Database & Data)
.DESCRIPTION
    Deploys the Warehouse Orchestrator platform to Windows Services while connecting
    to the existing database without dropping, modifying, or re-initializing data.
#>
[CmdletBinding()]
param(
    [string]`$InstallPath = "C:\warehouse-platform",
    [string]`$DbName = "$DbName",
    [string]`$DbHost = "$DbHost",
    [string]`$DbPassword = "$DbPassword",
    [switch]`$SkipDbInit = `$$PreserveExistingDb
)

`$scriptPath = Join-Path `$PSScriptRoot "scripts\onprem\deploy_windows_platform.ps1"
if (-not (Test-Path `$scriptPath)) {
    Write-Error "Deployment script not found at: `$scriptPath"
    exit 1
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " WAREHOUSE ORCHESTRATOR - DEPLOYMENT LAUNCHER (EXISTING DB MODE)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " Target Database : `$DbName (Preserving existing schema and data)" -ForegroundColor Green
Write-Host " Database Host   : `$DbHost" -ForegroundColor White
Write-Host " Install Target  : `$InstallPath" -ForegroundColor White
Write-Host " Skip DB Init    : `$SkipDbInit" -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Cyan

& `$scriptPath -Mode FromReleasePackage -ReleasePath `$PSScriptRoot -InstallPath `$InstallPath -DbName `$DbName -DbHost `$DbHost -DbPassword `$DbPassword -SkipDbInit:`$SkipDbInit
"@

$deployPs1File = Join-Path $OutputPath "deploy.ps1"
Set-Content -Path $deployPs1File -Value $deployPs1Content -Encoding UTF8
Write-Host " Created one-click deployment script: $deployPs1File" -ForegroundColor Green

$deployBatContent = @"
@echo off
REM ============================================================================
REM Warehouse Orchestrator - One-Click Deployment Launcher (Existing DB Mode)
REM ============================================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*
"@
$deployBatFile = Join-Path $OutputPath "deploy.bat"
Set-Content -Path $deployBatFile -Value $deployBatContent -Encoding ASCII
Write-Host " Created batch launcher: $deployBatFile" -ForegroundColor Green

# 7. Generate Documentation in release folder
$readmeContent = @"
================================================================================
WAREHOUSE ORCHESTRATOR - OFFLINE RELEASE BUNDLE INSTRUCTIONS
(EXISTING DATABASE MODE - ZERO DATA LOSS)
================================================================================

PREREQUISITES ON TARGET PC:
  1. Java 21 (or 17) LTS installed (verify: java -version)
  2. Python 3.10+ installed (verify: python --version)
  3. PostgreSQL 16/17 running on port 5432 with existing database: $DbName
  4. Eclipse Mosquitto MQTT broker running on port 1883
  5. Elevated PowerShell (Run as Administrator)

--------------------------------------------------------------------------------
1. ONE-CLICK DEPLOYMENT (USES EXISTING DATABASE & DATA)
--------------------------------------------------------------------------------
Open PowerShell as Administrator in the release folder and run:

  .\deploy.ps1

Or simply run from Command Prompt:
  deploy.bat

This command:
  - Deploys all 8 services (7 Spring Boot JARs + Python Analysis Engine) to C:\warehouse-platform
  - Configures services to use existing database '$DbName' on $DbHost
  - Preserves all existing database schemas, tables, users, and business data
  - Registers and starts Windows Services in dependency order
  - Preserves existing administrator credentials without forced resets

Once complete:
  Web UI Access   : http://localhost:8080
  Management Tool : .\scripts\onprem\manage_services.ps1

--------------------------------------------------------------------------------
2. SERVICE MANAGEMENT (DAY-2 OPERATIONS)
--------------------------------------------------------------------------------
Use .\scripts\onprem\manage_services.ps1 to control all platform services:

  - Check status & health:   .\scripts\onprem\manage_services.ps1 -Action status
  - Start all services:      .\scripts\onprem\manage_services.ps1 -Action start
  - Stop all services:       .\scripts\onprem\manage_services.ps1 -Action stop
  - Restart all services:    .\scripts\onprem\manage_services.ps1 -Action restart
  - Unregister from Windows: .\scripts\onprem\manage_services.ps1 -Action uninstall
  - Live log streaming:      .\scripts\onprem\manage_services.ps1 -Action logs -Service analysis

--------------------------------------------------------------------------------
3. SAFE PLATFORM RESET (PRESERVING DATABASE)
--------------------------------------------------------------------------------
To reinstall or update platform binaries WITHOUT touching the database:

  .\scripts\onprem\decommission_platform.ps1 -RemoveInstallDir

Notice:
  - The database '$DbName' and all data are PRESERVED intact.
  - NEVER pass -DropDatabase if you want to keep your existing data.
================================================================================
"@

$readmeFile = Join-Path $OutputPath "README_DEPLOY.txt"
Set-Content -Path $readmeFile -Value $readmeContent -Encoding UTF8

$readmeMdContent = @"
# Warehouse Orchestrator — Offline Release Bundle Guide
**Deployment Mode: Existing Database (Zero Data Loss)**

This release bundle is pre-configured to connect to your existing PostgreSQL database (\`$DbName\`), preserving all existing schemas, tables, records, and credentials without disruption.

---

## Prerequisites on Target Host
1. **Java 21 or 17 LTS**: \`java -version\` in System PATH.
2. **Python 3.10+**: \`python --version\` in System PATH.
3. **PostgreSQL 16/17**: Running on port 5432 with existing database \`$DbName\`.
4. **Eclipse Mosquitto**: Running on port 1883.
5. **PowerShell**: Elevated shell (**Run as Administrator**).

---

## 1. One-Click Platform Deployment
Open an elevated PowerShell prompt in this release folder:

\`\`\`powershell
.\deploy.ps1
\`\`\`

*(Or run \`deploy.bat\` from an Administrator command prompt)*

### What This Does:
- Stages all 7 Spring Boot microservice binaries into \`C:\warehouse-platform\bin\`.
- Stages the Python FastAPI Handshake & Station Tag Analysis service into \`C:\warehouse-platform\tools\analyzer\`.
- Deploys the industrial React Web UI into \`C:\warehouse-platform\static-ui\`.
- Connects automatically to existing database \`$DbName\` on \`$DbHost\`.
- Skips schema overwrites (\`-SkipDbInit\`), keeping all existing data 100% intact.
- Preserves existing administrator credentials.
- Registers and starts Windows services via WinSW.

### Platform Access:
- **Web UI URL**: [http://localhost:8080](http://localhost:8080)
- **Application Logs**: \`C:\warehouse-platform\logs\`

---

## 2. Day-2 Service Operations
Manage all platform services using \`manage_services.ps1\`:

\`\`\`powershell
# Check status of Windows services and Actuator health endpoints
.\scripts\onprem\manage_services.ps1 -Action status

# Start all services in dependency order
.\scripts\onprem\manage_services.ps1 -Action start

# Graceful reverse shutdown
.\scripts\onprem\manage_services.ps1 -Action stop

# Restart all services
.\scripts\onprem\manage_services.ps1 -Action restart

# Unregister from Windows SCM
.\scripts\onprem\manage_services.ps1 -Action uninstall

# Tail live log for a specific service (auth, wes, wms, wcs, asrs, fleet, gateway, analysis)
.\scripts\onprem\manage_services.ps1 -Action logs -Service analysis
\`\`\`

---

## 3. Platform Binaries Reset (Preserving Database)
To update or reinstall platform binaries without affecting the database:

\`\`\`powershell
.\scripts\onprem\decommission_platform.ps1 -RemoveInstallDir
\`\`\`

> **SAFETY NOTICE**: The database \`$DbName\` and all warehouse data remain completely safe and untouched.
"@

$readmeMdFile = Join-Path $OutputPath "README_DEPLOY.md"
Set-Content -Path $readmeMdFile -Value $readmeMdContent -Encoding UTF8

# Summary
Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host " RELEASE BUNDLE GENERATION COMPLETE!" -ForegroundColor Green
Write-Host " Bundle Location      : $OutputPath" -ForegroundColor White
Write-Host " Target Database Mode : $DbName (Preserving existing DB and data)" -ForegroundColor Green
Write-Host " One-Click Deployer   : $deployPs1File" -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Cyan

if ($stagedJars.Count -gt 0) {
    $stagedJars | Format-Table Component, File, Size, Status -AutoSize
}

Write-Host "Help & Documentation files included in release bundle:" -ForegroundColor Yellow
Write-Host "  - $readmeFile" -ForegroundColor White
Write-Host "  - $readmeMdFile" -ForegroundColor White

Write-Host "`nYou can now deploy directly with: .\deploy.ps1 (or copy '$OutputPath' to offline media)." -ForegroundColor Cyan
Write-Host "================================================================================`n" -ForegroundColor Cyan
