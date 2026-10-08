<#
.SYNOPSIS
    Day-2 Service Management Utility for Warehouse Orchestrator on Windows.
.DESCRIPTION
    Allows site engineers to query status, start, stop, restart, or inspect live logs
    for all 7 platform microservices without memorizing manual commands.
.PARAMETER Action
    Action to perform: 'status', 'start', 'stop', 'restart', 'logs'. Default: 'status'
.PARAMETER Service
    Target service for 'logs' or single-service action.
    Options: 'all', 'auth', 'wes', 'wms', 'wcs', 'asrs', 'fleet', 'gateway'. Default: 'all'
.EXAMPLE
    .\scripts\onprem\manage_services.ps1 -Action status
.EXAMPLE
    .\scripts\onprem\manage_services.ps1 -Action restart
.EXAMPLE
    .\scripts\onprem\manage_services.ps1 -Action logs -Service wes
#>

[CmdletBinding()]
param(
    [ValidateSet("status", "start", "stop", "restart", "logs", "uninstall")]
    [string]$Action = "status",
    [ValidateSet("all", "auth", "wes", "wms", "wcs", "asrs", "fleet", "gateway", "analysis")]
    [string]$Service = "all",
    [string]$InstallPath = "C:\warehouse-platform"
)

$servicesOrderForward = @(
    @{ id = "warehouse-auth";     name = "Auth Service";     port = 8085; log = "auth-service" },
    @{ id = "warehouse-wcs";      name = "WCS Service";      port = 8083; log = "wcs-service" },
    @{ id = "warehouse-asrs";     name = "ASRS Service";     port = 8087; log = "asrs-wcs-service" },
    @{ id = "warehouse-fleet";    name = "Fleet Service";    port = 8084; log = "fleet-service" },
    @{ id = "warehouse-wms";      name = "WMS Service";      port = 8082; log = "wms-service" },
    @{ id = "warehouse-wes";      name = "WES Service";      port = 8086; log = "wes-service" },
    @{ id = "warehouse-analysis"; name = "Analysis Service"; port = 8095; log = "analysis-service"; healthPath = "/api/v1/analysis/stations" },
    @{ id = "warehouse-gateway";  name = "Gateway/UI";       port = 8080; log = "gateway-service" }
)

$servicesOrderReverse = @($servicesOrderForward)
[array]::Reverse($servicesOrderReverse)

switch ($Action) {
    "status" {
        Write-Host "`n=== WAREHOUSE PLATFORM - SERVICES STATUS ===" -ForegroundColor Cyan
        $results = @()
        foreach ($s in $servicesOrderForward) {
            $svcObj = Get-Service -Name $s.id -ErrorAction SilentlyContinue
            $scmStatus = if ($svcObj) { $svcObj.Status } else { "NOT_INSTALLED" }

            $actuatorStatus = "OFFLINE"
            $healthUrl = if ($s.healthPath) { "http://localhost:$($s.port)$($s.healthPath)" } else { "http://localhost:$($s.port)/actuator/health" }
            try {
                $res = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 -ErrorAction Stop
                if ($res.status) { $actuatorStatus = $res.status }
                elseif ($res.stations -ne $null -or $res -ne $null) { $actuatorStatus = "UP" }
            } catch {
                $actuatorStatus = "UNREACHABLE"
            }

            $results += [PSCustomObject]@{
                Service   = $s.name
                ServiceId = $s.id
                Port      = $s.port
                SCMStatus = $scmStatus
                Actuator  = $actuatorStatus
            }
        }
        $results | Format-Table -AutoSize
    }

    "start" {
        Write-Host "`n=== STARTING PLATFORM (PHASED SEQUENTIAL STARTUP) ===" -ForegroundColor Cyan
        
        Write-Host "Phase 1: Identity & Access (warehouse-auth)..." -ForegroundColor Yellow
        Start-Service warehouse-auth -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 4

        Write-Host "Phase 2: Subsystem Adapters (wcs, asrs, fleet)..." -ForegroundColor Yellow
        Start-Service warehouse-wcs -ErrorAction SilentlyContinue
        Start-Service warehouse-asrs -ErrorAction SilentlyContinue
        Start-Service warehouse-fleet -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 4

        Write-Host "Phase 3: Core Engines (wms, wes)..." -ForegroundColor Yellow
        Start-Service warehouse-wms -ErrorAction SilentlyContinue
        Start-Service warehouse-wes -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 6

        Write-Host "Phase 3b: Telemetry Analysis (warehouse-analysis)..." -ForegroundColor Yellow
        Start-Service warehouse-analysis -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2

        Write-Host "Phase 4: API Gateway (warehouse-gateway)..." -ForegroundColor Yellow
        Start-Service warehouse-gateway -ErrorAction SilentlyContinue

        Write-Host "All start requests dispatched. Checking status..." -ForegroundColor Green
        & $PSCommandPath -Action status -InstallPath $InstallPath
    }

    "stop" {
        Write-Host "`n=== STOPPING PLATFORM (GRACEFUL REVERSE SHUTDOWN) ===" -ForegroundColor Cyan
        foreach ($s in $servicesOrderReverse) {
            Write-Host "Stopping $($s.id)..." -ForegroundColor Yellow
            Stop-Service -Name $s.id -ErrorAction SilentlyContinue
        }
        Write-Host "All services stopped." -ForegroundColor Green
    }

    "restart" {
        Write-Host "`n=== RESTARTING PLATFORM ===" -ForegroundColor Cyan
        & $PSCommandPath -Action stop -InstallPath $InstallPath
        Start-Sleep -Seconds 5
        & $PSCommandPath -Action start -InstallPath $InstallPath
    }

    "logs" {
        $logsDir = Join-Path $InstallPath "logs"
        if ($Service -eq "all") {
            Write-Host "`nListing latest log files in ${logsDir}:" -ForegroundColor Cyan
            Get-ChildItem -Path $logsDir -Recurse -Filter "*.log" | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize
            Write-Host "To follow a specific service log, run: .\manage_services.ps1 -Action logs -Service <name>" -ForegroundColor Yellow
        } else {
            $matched = $servicesOrderForward | Where-Object { $_.log -match $Service } | Select-Object -First 1
            if ($matched) {
                $targetLog = (Get-ChildItem -Path $svcLogDir -Filter "$($matched.log)*.out.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName)
                if (-not $targetLog -or (-not (Test-Path $targetLog))) {
                    $targetLog = Join-Path $svcLogDir "$($matched.log).out.log"
                }
                if (-not (Test-Path $targetLog)) {
                    $targetLog = (Get-ChildItem -Path $svcLogDir -Filter "$($matched.log)*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName)
                }
                if (-not $targetLog -or (-not (Test-Path $targetLog))) {
                    $targetLog = Join-Path $svcLogDir "$($matched.log).wrapper.log"
                }
                if ($targetLog -and (Test-Path $targetLog)) {
                    Write-Host "Tailing log file: $targetLog (Press Ctrl+C to stop)..." -ForegroundColor Cyan
                    Get-Content -Path $targetLog -Tail 50 -Wait
                } else {
                    Write-Warning "Log file not found in: $svcLogDir"
                }
            } else {
                Write-Warning "No matching service found for '$Service'."
            }
        }
    }

    "uninstall" {
        Write-Host "`n=== UNINSTALLING PLATFORM SERVICES FROM WINDOWS SCM ===" -ForegroundColor Cyan
        & $PSCommandPath -Action stop -InstallPath $InstallPath
        $wrapperDir = Join-Path $InstallPath "service-wrapper"

        foreach ($s in $servicesOrderReverse) {
            Write-Host "Unregistering $($s.id)..." -ForegroundColor Yellow
            $exePath = Join-Path $wrapperDir "$($s.log).exe"
            if (Test-Path $exePath) {
                & $exePath uninstall 2>&1 | Out-Null
            }
            # Ensure removal via sc.exe delete
            & sc.exe delete $($s.id) 2>&1 | Out-Null
            Write-Host "[OK] $($s.id) removed from Windows SCM." -ForegroundColor Green
        }
        Write-Host "`nAll platform services unregistered from Windows." -ForegroundColor Green
        Write-Host "To also drop the database and remove $InstallPath, run: .\scripts\onprem\decommission_platform.ps1 -DropDatabase -RemoveInstallDir" -ForegroundColor Cyan
    }
}
