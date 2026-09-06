<#
.SYNOPSIS
    Automated Build & Staging Tool for Warehouse Orchestrator Microservices
.DESCRIPTION
    Builds executable Spring Boot fat JARs using Maven and copies them to a
    designated target directory (e.g., C:\warehouse-platform\bin) with canonical names.
.PARAMETER DestinationPath
    Directory where production JARs should be stored. Default: C:\warehouse-platform\bin
.PARAMETER Service
    (Optional) Build only a specific service: 'auth', 'gateway', 'wes', 'wms', 'all'. Default: 'all'
.PARAMETER SkipBuild
    If specified, skips Maven packaging and only copies existing built JARs.
#>
param(
    [string]$DestinationPath = "C:\warehouse-platform\bin",
    [ValidateSet("all", "auth", "gateway", "wes", "wms", "wcs", "fleet", "asrs")]
    [string]$Service = "all",
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " WAREHOUSE ORCHESTRATOR - JAR BUILD & STAGING PIPELINE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Target Directory : $DestinationPath" -ForegroundColor White
Write-Host " Target Service   : $Service" -ForegroundColor White

$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName

# 1. Ensure target directory exists
if (-not (Test-Path $DestinationPath)) {
    Write-Host "`n[SETUP] Creating target directory: $DestinationPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
}

# 2. Execute Maven Packaging
if (-not $SkipBuild) {
    Set-Location $repoRoot
    Write-Host "`n[BUILD] Running Maven clean package (skip tests)..." -ForegroundColor Yellow

    if ($Service -eq "all") {
        & mvn clean package -DskipTests
    } else {
        $moduleName = "$($Service)-service"
        if ($Service -eq "asrs") { $moduleName = "asrs-wcs-service" }
        Write-Host "Packaging module: services/$moduleName..." -ForegroundColor White
        & mvn clean package -pl "services/$moduleName" -am -DskipTests
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[ERROR] Maven packaging failed with exit code $LASTEXITCODE!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "[BUILD SUCCESS] All artifacts packaged." -ForegroundColor Green
} else {
    Write-Host "`n[INFO] Skipping Maven build (-SkipBuild specified). Staging existing JARs..." -ForegroundColor Cyan
}

# 3. Discover and Copy Executable JARs
Write-Host "`n[STAGE] Staging executable JARs to: $DestinationPath" -ForegroundColor Yellow

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
    if ($Service -ne "all" -and $Service -notmatch ($svcKey.Split('-')[0])) {
        continue
    }

    $targetDir = Join-Path $repoRoot "services\$svcKey\target"
    if (Test-Path $targetDir) {
        $sourceJar = Get-ChildItem -Path $targetDir -Filter "$svcKey-*.jar" | 
                     Where-Object { $_.Name -notmatch "original|sources|javadoc" } | 
                     Select-Object -First 1

        if ($sourceJar) {
            $destFileName = $serviceMappings[$svcKey]
            $destFile = Join-Path $DestinationPath $destFileName
            
            Copy-Item -Path $sourceJar.FullName -Destination $destFile -Force
            
            $fileSizeMB = [math]::Round($sourceJar.Length / 1MB, 2)
            $stagedJars += [PSCustomObject]@{
                Service     = $svcKey
                Canonical   = $destFileName
                SizeMB      = "$fileSizeMB MB"
                TargetPath  = $destFile
            }
        }
    }
}

# 4. Display Summary Table
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " STAGED PRODUCTION JARS SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
$stagedJars | Format-Table Service, Canonical, SizeMB, TargetPath -AutoSize

Write-Host "Deployment Ready! Run services from '$DestinationPath' using:" -ForegroundColor Green
Write-Host "  java -jar `"$DestinationPath\auth-service.jar`"" -ForegroundColor White
Write-Host "============================================================`n" -ForegroundColor Cyan
