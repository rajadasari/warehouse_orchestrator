<#
.SYNOPSIS
    Automated Offline Release Bundle Packager for Warehouse Orchestrator
.DESCRIPTION
    Compiles and packages all required components into a self-contained offline
    release bundle ready to be copied to a USB drive or air-gapped machine.
.PARAMETER OutputPath
    Destination directory where the release bundle will be created. Default: 'C:\release'
.PARAMETER SkipBuild
    Skip Maven and npm compilation (uses existing target/ and dist/ artifacts).
.EXAMPLE
    .\scripts\package_release.ps1 -OutputPath "C:\release"
.EXAMPLE
    .\scripts\package_release.ps1 -OutputPath "D:\release" -SkipBuild
#>
[CmdletBinding()]
param(
    [string]$OutputPath = "C:\release",
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " WAREHOUSE ORCHESTRATOR - OFFLINE RELEASE BUNDLE PACKAGER" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " Output Directory : $OutputPath" -ForegroundColor White
Write-Host " Skip Build       : $SkipBuild" -ForegroundColor White
Write-Host " Timestamp        : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Cyan

$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName

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
Write-Host "`n[STEP 1/5] Release directory tree created under $OutputPath" -ForegroundColor Green

# 2. Build & Stage Spring Boot JARs
Write-Host "`n[STEP 2/5] Packaging Backend Services..." -ForegroundColor Yellow

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
Write-Host "`n[STEP 3/5] Packaging React Web UI..." -ForegroundColor Yellow
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
Write-Host "`n[STEP 4/5] Securing WinSW Service Wrapper binary for offline use..." -ForegroundColor Yellow
$winSwPath = Join-Path $toolsDir "WinSW-x64.exe"

if (-not (Test-Path $winSwPath)) {
    # Check if we already have it in C:\warehouse-platform\service-wrapper\WinSW.exe
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
Write-Host "`n[STEP 5/5] Staging Automation & Database Scripts..." -ForegroundColor Yellow
$srcScripts = Join-Path $repoRoot "scripts"
Copy-Item -Path "$srcScripts\db" -Destination (Join-Path $scriptsDir "db") -Recurse -Force
Copy-Item -Path "$srcScripts\onprem" -Destination (Join-Path $scriptsDir "onprem") -Recurse -Force

# Verify key scripts exist in the release bundle
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

# 6. Generate Quick-Start & Operational Instructions in release folder
$readmeContent = @'
================================================================================
WAREHOUSE ORCHESTRATOR - OFFLINE RELEASE BUNDLE INSTRUCTIONS
================================================================================

PREREQUISITES ON TARGET PC:
  1. Java 21 (or 17) LTS installed (verify: java -version)
  2. PostgreSQL 16 installed and running on port 5432
  3. Eclipse Mosquitto MQTT broker installed and running on port 1883
  4. Elevated PowerShell (Run as Administrator)

--------------------------------------------------------------------------------
1. FRESH DEPLOYMENT
--------------------------------------------------------------------------------
Open PowerShell as Administrator in the release folder:

  .\scripts\onprem\deploy_windows_platform.ps1 -Mode FromReleasePackage -ReleasePath .

Once complete:
  Web UI Access   : http://localhost:8080
  Default Admin   : admin
  Default Password: Admin@Master2026! (Mandatory password change on first login)

--------------------------------------------------------------------------------
2. SERVICE MANAGEMENT (DAY-2)
--------------------------------------------------------------------------------
Use .\scripts\onprem\manage_services.ps1 to control all 7 microservices:

  - Check status & health:   .\scripts\onprem\manage_services.ps1 -Action status
  - Start all services:      .\scripts\onprem\manage_services.ps1 -Action start
  - Stop all services:       .\scripts\onprem\manage_services.ps1 -Action stop
  - Restart all services:    .\scripts\onprem\manage_services.ps1 -Action restart
  - Unregister from Windows: .\scripts\onprem\manage_services.ps1 -Action uninstall
  - Live log streaming:      .\scripts\onprem\manage_services.ps1 -Action logs -Service auth

--------------------------------------------------------------------------------
3. DECOMMISSIONING & FACTORY RESET (FOR TESTING MULTIPLE TIMES ON SAME PC)
--------------------------------------------------------------------------------
To wipe the installation and reset the database so you can re-test fresh deployment:

  # Complete automated 1-command reset:
  .\scripts\onprem\decommission_platform.ps1 -DropDatabase -RemoveInstallDir

This command:
  - Stops all 7 running platform services in reverse dependency order
  - Unregisters all services from Windows Service Control Manager (SCM)
  - Removes inbound Windows Firewall rules (ports 8080, 1883)
  - Drops the PostgreSQL database ('warehouse_test_db') and application role ('warehouse_app')
  - Deletes 'C:\warehouse-platform' (binaries, logs, and configs)

After decommissioning, you can immediately test fresh deployment again:
  .\scripts\onprem\deploy_windows_platform.ps1 -Mode FromReleasePackage -ReleasePath .
================================================================================
'@

$readmeFile = Join-Path $OutputPath "README_DEPLOY.txt"
Set-Content -Path $readmeFile -Value $readmeContent -Encoding UTF8

$readmeMdContent = @'
# Warehouse Orchestrator — Offline Release Bundle Guide

## Prerequisites on Target Host
1. **Java 21 or 17 LTS**: `java -version` in System PATH.
2. **PostgreSQL 16**: Running on port 5432 with superuser `postgres`.
3. **Eclipse Mosquitto**: Running on port 1883.
4. **PowerShell**: Elevated shell (**Run as Administrator**).

---

## 1. Fresh Platform Deployment
Open an elevated PowerShell prompt in this folder:

```powershell
.\scripts\onprem\deploy_windows_platform.ps1 -Mode FromReleasePackage -ReleasePath .
```

### Day-0 Access
- **Web UI URL**: [http://localhost:8080](http://localhost:8080)
- **Username**: `admin`
- **Default Password**: `Admin@Master2026!`
- *(Per IEC 62443 compliance, you will be prompted to change your password upon first login)*

---

## 2. Day-2 Service Operations
Manage all 7 platform services using `manage_services.ps1`:

```powershell
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

# Tail live log for a specific service (auth, wes, wms, wcs, asrs, fleet, gateway)
.\scripts\onprem\manage_services.ps1 -Action logs -Service wes
```

---

## 3. Decommissioning & Reset (For Iterative Testing)
To return the host to a factory-fresh state for repeated testing on the same PC:

```powershell
.\scripts\onprem\decommission_platform.ps1 -DropDatabase -RemoveInstallDir
```

### Parameters:
- `-DropDatabase`: Terminates active connections and drops `warehouse_test_db` & `warehouse_app` role.
- `-RemoveInstallDir`: Deletes `C:\warehouse-platform` completely.
- `-RemoveFirewallRules`: Removes the inbound rules for port 8080 and 1883.

### Re-Deploy Cycle:
```powershell
# 1. Reset
.\scripts\onprem\decommission_platform.ps1 -DropDatabase -RemoveInstallDir

# 2. Deploy again
.\scripts\onprem\deploy_windows_platform.ps1 -Mode FromReleasePackage -ReleasePath .
```
'@

$readmeMdFile = Join-Path $OutputPath "README_DEPLOY.md"
Set-Content -Path $readmeMdFile -Value $readmeMdContent -Encoding UTF8

# Summary
Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host " RELEASE BUNDLE GENERATION COMPLETE!" -ForegroundColor Green
Write-Host " Bundle Location: $OutputPath" -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Cyan

if ($stagedJars.Count -gt 0) {
    $stagedJars | Format-Table Component, File, Size, Status -AutoSize
}

Write-Host "Help & Documentation files included in release bundle:" -ForegroundColor Yellow
Write-Host "  - $readmeFile" -ForegroundColor White
Write-Host "  - $readmeMdFile" -ForegroundColor White

Write-Host "`nYou can now copy the folder '$OutputPath' directly to a USB drive or the offline PC." -ForegroundColor Cyan
Write-Host "================================================================================`n" -ForegroundColor Cyan

