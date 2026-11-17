#Requires -Version 7
<#
  EU Limousine: run the Postman collection automatically (Newman).

  One-time setup (repo root):   npm install -D newman newman-reporter-htmlextra

  Local (all 51 checks, creates test data in the LOCAL database):
    pwsh -ExecutionPolicy Bypass -File scripts/api-tests.ps1
  Production (read-only checks only, never creates data):
    pwsh -ExecutionPolicy Bypass -File scripts/api-tests.ps1 -Target prod

  Reports go to postman/reports/ (HTML + JUnit XML).
#>
param(
  [ValidateSet('local', 'prod')] [string] $Target = 'local'
)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$collection = 'postman/eul-api.postman_collection.json'
$reportDir = 'postman/reports'
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

if (-not (Test-Path 'node_modules/newman')) {
  Write-Host 'Newman is not installed. Run once:  npm install -D newman newman-reporter-htmlextra' -ForegroundColor Red
  exit 1
}

$envVars = @()
$folders = @()

if ($Target -eq 'local') {
  $environment = 'postman/local.postman_environment.json'
  # Admin login from .env (never stored in the collection)
  $dotEnv = @{}
  Get-Content .env | Where-Object { $_ -match '^\s*[A-Z0-9_]+\s*=' } | ForEach-Object {
    $k, $v = $_ -split '=', 2; $dotEnv[$k.Trim()] = $v.Trim().Trim('"').Trim("'")
  }
  $envVars += '--env-var', "adminEmail=$($dotEnv.SEED_ADMIN_EMAIL)"
  $envVars += '--env-var', "adminPassword=$($dotEnv.SEED_ADMIN_PASSWORD)"
} else {
  $environment = 'postman/prod.postman_environment.json'
  $email = $env:EUL_PROD_ADMIN_EMAIL
  if (-not $email) { $email = Read-Host 'Production login email (use a DISPATCHER test account)' }
  $password = $env:EUL_PROD_ADMIN_PASSWORD
  if (-not $password) { $password = Read-Host 'Password' -MaskInput }
  $envVars += '--env-var', "adminEmail=$email", '--env-var', "adminPassword=$password"
  # Read-only folders only. Folder 03 is also guarded by allowWrites=false in the environment.
  $folders = @(
    '--folder', '00 Public and health (safe everywhere)',
    '--folder', '01 Auth and permissions (safe everywhere)',
    '--folder', '02 Dashboard reads (safe everywhere)',
    '--folder', '04 Logout (safe everywhere)'
  )
  Write-Host "Running READ-ONLY checks against production." -ForegroundColor Yellow
}

$reporters = 'cli,junit'
$reporterArgs = @('--reporter-junit-export', "$reportDir/$Target-$stamp.xml")
if (Test-Path 'node_modules/newman-reporter-htmlextra') {
  $reporters += ',htmlextra'
  $reporterArgs += '--reporter-htmlextra-export', "$reportDir/$Target-$stamp.html", '--reporter-htmlextra-skipSensitiveData'
}

npx newman run $collection -e $environment @envVars @folders `
  --reporters $reporters @reporterArgs `
  --timeout-request 30000 --delay-request 50 --color on
$code = $LASTEXITCODE

Write-Host ''
if ($code -eq 0) { Write-Host "ALL API CHECKS PASSED ($Target)" -ForegroundColor Green }
else { Write-Host "SOME API CHECKS FAILED ($Target): see the table above" -ForegroundColor Red }
Write-Host "Reports: $reportDir/$Target-$stamp.*"
exit $code
