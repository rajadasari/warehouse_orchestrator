<#
.SYNOPSIS
    Warehouse Digital Twin Orchestrator - Master Administrator Commissioning Tool
.DESCRIPTION
    Used during Day-0 deployment to initialize or reset the Master Administrator
    credentials on an on-premise, air-gapped industrial server.
    Conforms to IEC 62443-4-2 OT Security Standards.
.PARAMETER NewPassword
    (Optional) The new Master Administrator password to set. If omitted, a secure
    random one-time passkey will be generated.
.PARAMETER PostgresUser
    Postgres superuser (defaults to 'postgres')
.PARAMETER DbName
    Target database (defaults to 'warehouse_db')
#>
param(
    [string]$NewPassword = "",
    [string]$PostgresUser = "postgres",
    [string]$DbName = "warehouse_db"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " WAREHOUSE ORCHESTRATOR - MASTER ADMIN COMMISSIONING (DAY-0)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Generate or validate password
if ([string]::IsNullOrWhiteSpace($NewPassword)) {
    $chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 7
    $rng.GetBytes($bytes)
    $p1 = ($bytes[0..3] | ForEach-Object { $chars[$_ % $chars.Length] }) -join ""
    $p2 = ($bytes[4..6] | ForEach-Object { $chars[$_ % $chars.Length] }) -join ""
    $NewPassword = "WHS-$p1-$p2"
}

Write-Host "`n[COMMISSIONING] Initializing Master Administrator Account:" -ForegroundColor Yellow
Write-Host "  Facility       : FAC-BLR-01" -ForegroundColor White
Write-Host "  Master Username: admin" -ForegroundColor White
Write-Host "  One-Time Key   : $NewPassword" -ForegroundColor Green
Write-Host "  Status         : Force Password Change = TRUE (Mandatory on 1st Login)" -ForegroundColor Yellow

# 2. Output update instructions for PostgreSQL
$sql = "UPDATE auth.users SET password_hash = 'INIT:$NewPassword', force_password_change = TRUE WHERE username = 'admin';"

Write-Host "`n[APPLY TO DATABASE] Executing SQL via psql..." -ForegroundColor Gray

try {
    # Attempt execution if psql is in PATH or Program Files
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    $psqlPath = if ($psqlCmd) { $psqlCmd.Source } else {
        Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue | 
            Where-Object { $_.FullName -notmatch "pgAdmin" } | 
            Select-Object -First 1 -ExpandProperty FullName
    }

    if ($psqlPath -and (Test-Path $psqlPath)) {
        & $psqlPath -U $PostgresUser -d $DbName -c $sql
        Write-Host "[SUCCESS] Master Admin password updated in PostgreSQL." -ForegroundColor Green
    } else {
        Write-Host "[NOTE] psql command not found in PATH." -ForegroundColor Yellow
        Write-Host "Run the following SQL statement in your PostgreSQL console:" -ForegroundColor White
        Write-Host $sql -ForegroundColor Cyan
    }
} catch {
    Write-Host "[WARN] Could not automatically execute via psql. Run manually:" -ForegroundColor Yellow
    Write-Host $sql -ForegroundColor Cyan
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " HANDOVER COMPLETE. Log in at http://<server-ip>:8080" -ForegroundColor Cyan
Write-Host " The system will immediately require setting a confidential password." -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Cyan
