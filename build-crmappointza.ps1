# Connect CRM production build (UI + crmappointza server).
# One URL file in the build: <OutDir>\crmappointza-urls.json (next to crmappointza.exe)
#   backendListen       port Kestrel binds to
#   frontendApiBaseUrl  API origin the browser calls ("" = same host as the page)
#
# Output:
#   D:\aravindan\build\crmappointza
#
# Usage:
#   .\build-crmappointza.ps1
#   .\build-crmappointza.ps1 -OutDir D:\aravindan\build\crmappointza
#   .\build-crmappointza.ps1 -BackendListen "http://0.0.0.0:5050" -FrontendApiBaseUrl "https://crm.example.com"

#Requires -Version 5.1

param(
    [string]$BackendListen = "",
    [string]$FrontendApiBaseUrl = "",
    [string]$OutDir = "D:\aravindan\build\crmappointza"
)

$ErrorActionPreference = "Stop"

$root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$uiDir = Join-Path $root "connect-crm"
$serverProj = Join-Path $root "appointzacrmserver\crmappointza\crmappointza.csproj"
$prodOut = $OutDir
$wwwroot = Join-Path $prodOut "wwwroot"
$urlsPublic = Join-Path $uiDir "public\crmappointza-urls.json"
$urlsBuild = Join-Path $prodOut "crmappointza-urls.json"
$urlsProduction = Join-Path $root "appointzacrmserver\crmappointza-urls.production.json"
$env:CRM_APPOINTZA_BUILD_OUT = $prodOut

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-UrlsJson([string]$Path, [string]$Listen, [string]$ApiBase) {
    $obj = [ordered]@{
        backendListen      = $Listen
        frontendApiBaseUrl = $ApiBase
    }
    ($obj | ConvertTo-Json -Depth 3) + "`n" | Set-Content -Path $Path -Encoding UTF8
}

function Install-NpmIfNeeded([string]$ProjectPath) {
    if (Test-Path (Join-Path $ProjectPath "node_modules")) { return }
    Write-Host "Installing npm packages..." -ForegroundColor Yellow
    Push-Location $ProjectPath
    try {
        if (Test-Path "package-lock.json") { npm ci } else { npm install }
        if (-not $?) { throw "npm install failed" }
    } finally {
        Pop-Location
    }
}

function Stop-RunningServer {
    $proc = Get-Process -Name "crmappointza" -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Stopping running crmappointza.exe ..." -ForegroundColor Yellow
        Stop-Process -Name "crmappointza" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

try {
    Set-Location $root
    if (-not (Test-Path $serverProj)) { throw "Missing $serverProj" }
    if (-not (Test-Path $uiDir)) { throw "Missing connect-crm UI at $uiDir" }

    if (-not (Test-Path $urlsPublic)) {
        $seedListen = "http://0.0.0.0:5053"
        $seedApi = ""
        if (Test-Path $urlsProduction) {
            $seed = Get-Content -Raw -Path $urlsProduction | ConvertFrom-Json
            if ($seed.backendListen) { $seedListen = [string]$seed.backendListen }
            if ($null -ne $seed.frontendApiBaseUrl) { $seedApi = [string]$seed.frontendApiBaseUrl }
        }
        Write-UrlsJson -Path $urlsPublic -Listen $seedListen -ApiBase $seedApi
        Write-Host "Created $urlsPublic" -ForegroundColor Yellow
    }

    $preservedUrls = $null
    foreach ($candidate in @($urlsBuild, (Join-Path $wwwroot "crmappointza-urls.json"))) {
        if (Test-Path $candidate) {
            $preservedUrls = Get-Content -Raw -Path $candidate
            break
        }
    }

    Write-Step "Connect CRM (crmappointza) build"

    Write-Step "Publish .NET server"
    Stop-RunningServer
    if (Test-Path $prodOut) {
        Remove-Item -Path $prodOut -Recurse -Force
    }
    Push-Location (Split-Path -Parent $serverProj)
    try {
        $ErrorActionPreference = "Continue"
        & dotnet publish $serverProj -c Release -o $prodOut -p:BuildSpaOnPublish=false
        if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed (exit $LASTEXITCODE)" }
    } finally {
        $ErrorActionPreference = "Stop"
        Pop-Location
    }

    foreach ($extra in @("appsettings.Development.json", "appsettings.Production.json")) {
        $extraPath = Join-Path $prodOut $extra
        if (Test-Path $extraPath) { Remove-Item -Path $extraPath -Force }
    }

    if (Test-Path $wwwroot) { Remove-Item -Path $wwwroot -Recurse -Force }
    New-Item -ItemType Directory -Path $wwwroot -Force | Out-Null

    if ($preservedUrls) {
        Set-Content -Path $urlsBuild -Value $preservedUrls -Encoding UTF8
    }

    Write-Step "Build UI (connect-crm / Vite)"
    Install-NpmIfNeeded -ProjectPath $uiDir
    Push-Location $uiDir
    try {
        $ErrorActionPreference = "Continue"
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw "UI build failed (exit $LASTEXITCODE)" }
    } finally {
        $ErrorActionPreference = "Stop"
        Pop-Location
    }

    if (-not (Test-Path (Join-Path $wwwroot "index.html"))) {
        throw "Missing wwwroot/index.html after UI build."
    }

    $assetsDir = Join-Path $wwwroot "assets"
    if (-not (Test-Path $assetsDir)) {
        throw "Missing wwwroot/assets after UI build."
    }
    $uiFiles = Get-ChildItem -Path $wwwroot -Recurse -File -ErrorAction SilentlyContinue
    $assetFiles = Get-ChildItem -Path $assetsDir -File -ErrorAction SilentlyContinue
    $uiMb = [math]::Round((($uiFiles | Measure-Object -Property Length -Sum).Sum / 1MB), 2)
    if ($assetFiles.Count -lt 10) {
        throw "UI build looks incomplete: only $($assetFiles.Count) files in wwwroot/assets (expected many JS chunks)."
    }
    Write-Host "UI published: $($uiFiles.Count) files under wwwroot ($uiMb MB), $($assetFiles.Count) bundles in assets/" -ForegroundColor Green
    Write-Host '  Top level: index.html + assets/ — normal Vite output for Kestrel wwwroot.' -ForegroundColor DarkGray

    if (-not (Test-Path $urlsBuild)) {
        if (Test-Path $urlsProduction) {
            Copy-Item -Path $urlsProduction -Destination $urlsBuild -Force
        } else {
            Copy-Item -Path $urlsPublic -Destination $urlsBuild -Force
        }
    }
    Remove-Item -Path (Join-Path $wwwroot "crmappointza-urls.json") -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $wwwroot "_shell.html") -Force -ErrorAction SilentlyContinue

    $indexRaw = Get-Content -Raw -Path (Join-Path $wwwroot "index.html") -ErrorAction SilentlyContinue
    if (-not $indexRaw -or ($indexRaw -notmatch '\$_TSR|\$R\["tsr"\]')) {
        throw 'index.html is missing TanStack Start bootstrap ($_TSR). UI build is not safe to deploy.'
    }

    if ($BackendListen -or $PSBoundParameters.ContainsKey("FrontendApiBaseUrl")) {
        $existing = Get-Content -Raw -Path $urlsBuild | ConvertFrom-Json
        $listen = if ($BackendListen) { $BackendListen.Trim().TrimEnd('/') } else { [string]$existing.backendListen }
        $apiBase = if ($PSBoundParameters.ContainsKey("FrontendApiBaseUrl")) {
            if ($null -eq $FrontendApiBaseUrl) { "" } else { $FrontendApiBaseUrl.Trim().TrimEnd('/') }
        } else {
            [string]$existing.frontendApiBaseUrl
        }
        if (-not $listen) { $listen = "http://0.0.0.0:5053" }
        Write-UrlsJson -Path $urlsBuild -Listen $listen -ApiBase $apiBase
    }

    $finalUrls = Get-Content -Raw -Path $urlsBuild | ConvertFrom-Json

    @"
@echo off
cd /d "%~dp0"
crmappointza.exe
"@ | Set-Content -Path (Join-Path $prodOut "run.cmd") -Encoding ASCII

    Get-ChildItem -Path $prodOut -Recurse -File -ErrorAction SilentlyContinue |
        Unblock-File -ErrorAction SilentlyContinue

    Write-Step "Build completed"
    Write-Host "Output: $prodOut" -ForegroundColor Green
    Write-Host "Run:    $prodOut\run.cmd" -ForegroundColor Cyan
    Write-Host "Config: $urlsBuild" -ForegroundColor Cyan
    Write-Host "  backendListen:      $($finalUrls.backendListen)" -ForegroundColor DarkGray
    Write-Host "  frontendApiBaseUrl: $(if ($finalUrls.frontendApiBaseUrl) { $finalUrls.frontendApiBaseUrl } else { '(same host as the page)' })" -ForegroundColor DarkGray
    Write-Host "Edit that file and restart to change port or public API URL (Krios / Appointza style)." -ForegroundColor DarkGray
    exit 0
}
catch {
    Write-Host ""
    Write-Host "BUILD FAILED:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    Set-Location $root
}
