<#
.SYNOPSIS
    Warehouse Digital Twin Orchestrator - Automated Platform Decommissioning & Factory Reset Tool
.DESCRIPTION
    Safely stops all 7 platform Windows services, unregisters them from Windows Service Control
    Manager (SCM), clears firewall rules, resets PostgreSQL databases, and removes the installation
    directory. Enables rapid, repeated testing of the deployment pipeline on the same PC.
.PARAMETER InstallPath
    Installation directory to clean up. Default: 'C:\warehouse-platform'
.PARAMETER DbName
    Target database to drop if -DropDatabase is specified. Default: 'warehouse_test_db'
.PARAMETER DropDatabase
    Switch to terminate connections and drop the database and warehouse_app role. Default: $false
.PARAMETER RemoveInstallDir
    Switch to completely delete the C:\warehouse-platform directory. Default: $false
.PARAMETER RemoveFirewallRules
    Switch to remove platform inbound firewall rules. Default: $true
.EXAMPLE
    # Just stop and unregister services (keep database and files):
    .\scripts\onprem\decommission_platform.ps1

.EXAMPLE
    # Complete factory reset to test fresh deployment again:
    .\scripts\onprem\decommission_platform.ps1 -DropDatabase -RemoveInstallDir
#>

[CmdletBinding()]
param(
    [string]$InstallPath = "C:\warehouse-platform",
    [string]$DbName = "warehouse_test_db",
    [switch]$DropDatabase = $false,
    [switch]$RemoveInstallDir = $false,
    [switch]$RemoveFirewallRules = $true
)

$ErrorActionPreference = "Continue"

function Write-Header {
    param([string]$Title)
    Write-Host "`n================================================================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Yellow
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

# 1. Administrator check
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] This script MUST be run from an elevated PowerShell (Run as Administrator)!" -ForegroundColor Red
    exit 1
}

Write-Header "WAREHOUSE PLATFORM - DECOMMISSIONING & RESET TOOL"
Write-Host " Target Install Path : $InstallPath" -ForegroundColor White
Write-Host " Target Database     : $DbName" -ForegroundColor White
Write-Host " Drop Database       : $DropDatabase" -ForegroundColor White
Write-Host " Remove Install Dir  : $RemoveInstallDir" -ForegroundColor White
Write-Host " Timestamp           : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White

# 2. Stop all platform services in reverse dependency order
Write-Header "STEP 1: Graceful Service Shutdown"

$servicesInReverse = @(
    @{ id = "warehouse-gateway"; exe = "gateway-service" },
    @{ id = "warehouse-wes";     exe = "wes-service" },
    @{ id = "warehouse-wms";     exe = "wms-service" },
    @{ id = "warehouse-fleet";   exe = "fleet-service" },
    @{ id = "warehouse-asrs";    exe = "asrs-wcs-service" },
    @{ id = "warehouse-wcs";     exe = "wcs-service" },
    @{ id = "warehouse-auth";    exe = "auth-service" }
)

foreach ($svc in $servicesInReverse) {
    $svcObj = Get-Service -Name $svc.id -ErrorAction SilentlyContinue
    if ($svcObj) {
        if ($svcObj.Status -ne "Stopped") {
            Write-Host "Stopping $($svc.id)..." -ForegroundColor Yellow
            Stop-Service -Name $svc.id -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
        Write-Success "Service $($svc.id) stopped."
    } else {
        Write-Host "Service $($svc.id) is not registered in SCM." -ForegroundColor DarkGray
    }
}

# 3. Unregister services from Windows SCM
Write-Header "STEP 2: Unregister Services from Windows SCM"

$wrapperDir = Join-Path $InstallPath "service-wrapper"

foreach ($svc in $servicesInReverse) {
    $existing = Get-Service -Name $svc.id -ErrorAction SilentlyContinue
    if ($existing) {
        $exePath = Join-Path $wrapperDir "$($svc.exe).exe"
        if (Test-Path $exePath) {
            Write-Host "Uninstalling $($svc.id) via WinSW wrapper..." -ForegroundColor Yellow
            & $exePath uninstall 2>&1 | Out-Null
        }

        # Fallback verification / cleanup via sc.exe
        $checkAgain = Get-Service -Name $svc.id -ErrorAction SilentlyContinue
        if ($checkAgain) {
            Write-Host "Cleaning up $($svc.id) using sc.exe delete..." -ForegroundColor DarkGray
            & sc.exe delete $($svc.id) 2>&1 | Out-Null
        }
        Write-Success "Service $($svc.id) unregistered from Windows."
    } else {
        Write-Host "Service $($svc.id) already absent from SCM." -ForegroundColor DarkGray
    }
}

# 4. Optional: Clean up Windows Firewall rules
if ($RemoveFirewallRules) {
    Write-Header "STEP 3: Remove Windows Firewall Rules"
    try {
        Remove-NetFirewallRule -DisplayName "Warehouse Platform Gateway" -ErrorAction SilentlyContinue
        Remove-NetFirewallRule -DisplayName "Warehouse Mosquitto MQTT" -ErrorAction SilentlyContinue
        Write-Success "Inbound firewall rules removed."
    } catch {
        Write-Warn "Notice while removing firewall rules: $_"
    }
}

# 5. Optional: Drop Database & Application Role
if ($DropDatabase) {
    Write-Header "STEP 4: Reset PostgreSQL Database & Role"

    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    $psqlPath = if ($psqlCmd) { $psqlCmd.Source } else {
        Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch "pgAdmin" } |
            Select-Object -First 1 -ExpandProperty FullName
    }

    if ($psqlPath -and (Test-Path $psqlPath)) {
        Write-Host "Terminating active connections to '$DbName'..." -ForegroundColor Yellow
        & $psqlPath -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DbName' AND pid <> pg_backend_pid();" 2>&1 | Out-Null

        Write-Host "Dropping database '$DbName'..." -ForegroundColor Yellow
        & $psqlPath -U postgres -d postgres -c "DROP DATABASE IF EXISTS $DbName;" 2>&1 | Out-Null

        Write-Host "Dropping role 'warehouse_app'..." -ForegroundColor Yellow
        & $psqlPath -U postgres -d postgres -c "DROP ROLE IF EXISTS warehouse_app;" 2>&1 | Out-Null

        Write-Success "Database '$DbName' and role 'warehouse_app' purged."
    } else {
        Write-Warn "psql.exe not found. Please drop '$DbName' and 'warehouse_app' manually in pgAdmin or psql."
    }
}

# 6. Optional: Remove Installation Directory
if ($RemoveInstallDir) {
    Write-Header "STEP 5: Purge Platform Installation Directory"
    if (Test-Path $InstallPath) {
        Write-Host "Removing $InstallPath (including logs, binaries, config)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2 # Allow file locks from stopped services to release
        try {
            Remove-Item -Path $InstallPath -Recurse -Force -ErrorAction Stop
            Write-Success "Installation directory $InstallPath deleted."
        } catch {
            Write-Warn "Could not delete some files in $InstallPath (may be locked by another process): $_"
        }
    } else {
        Write-Host "Installation directory $InstallPath does not exist." -ForegroundColor DarkGray
    }
}

Write-Header "DECOMMISSIONING COMPLETE"
Write-Host " Platform services are stopped and unregistered." -ForegroundColor Green
if ($DropDatabase -and $RemoveInstallDir) {
    Write-Host " The system is in a pristine state, ready for fresh deployment testing!" -ForegroundColor Cyan
    Write-Host " To redeploy, run:" -ForegroundColor White
    Write-Host "   .\scripts\onprem\deploy_windows_platform.ps1" -ForegroundColor Yellow
} else {
    Write-Host " To perform a complete fresh re-test, re-run with: -DropDatabase -RemoveInstallDir" -ForegroundColor Cyan
}
Write-Host "================================================================================`n" -ForegroundColor Cyan
