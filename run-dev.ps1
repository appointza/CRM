#Requires -Version 5.1
param([switch]$ApiOnly)

$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$serverProj = Join-Path $root "appointzacrmserver\crmappointza\crmappointza.csproj"
$uiDir = Join-Path $root "connect-crm"

function Get-Port {
    foreach ($file in @(
        (Join-Path $root "appointzacrmserver\crmappointza-urls.production.json"),
        (Join-Path $uiDir "public\crmappointza-urls.json")
    )) {
        if (-not (Test-Path $file)) { continue }
        $listen = [string](Get-Content -Raw -Path $file | ConvertFrom-Json).backendListen
        if ($listen -match ':(\d+)/?$') { return [int]$Matches[1] }
    }
    return 5053
}

$port = Get-Port

if (-not (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process cmd.exe -ArgumentList @("/c", "dotnet run --project `"$serverProj`"") `
        -WorkingDirectory (Split-Path $serverProj) -WindowStyle Normal
}

if ($ApiOnly) { exit 0 }

if (-not (Test-Path (Join-Path $uiDir "node_modules"))) {
    Push-Location $uiDir
    try { npm install } finally { Pop-Location }
}

Start-Process npm.cmd -ArgumentList @("run", "dev") -WorkingDirectory $uiDir -WindowStyle Normal
Write-Host "Connect CRM dev — API http://localhost:$port — UI see connect-crm dev port"
