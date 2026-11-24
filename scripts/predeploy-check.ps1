# Everything that must pass before you merge into dev (and so before staging/production):
#   pwsh -ExecutionPolicy Bypass -File scripts/predeploy-check.ps1
#   pwsh -ExecutionPolicy Bypass -File scripts/predeploy-check.ps1 -Docker   # also build the 3 deploy images
#
# 1. verify.ps1 (Docker services, install, Prisma, migrations, seed, typecheck, tests, build)
# 2. starts API, worker, website and dashboard in a second window (npx turbo run dev)
# 3. waits until all of them answer
# 4. runs ALL Playwright end-to-end tests
# 5. optional: builds the backend, website and dashboard Docker images exactly like GitHub Actions
# 6. stops the apps again and prints a summary
param([switch]$Docker, [switch]$KeepRunning)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$results = [ordered]@{}

function Step($name) { Write-Host "`n=== $name ===" -ForegroundColor Cyan }
function Finish($code) {
  Write-Host "`n--- Summary ---" -ForegroundColor Cyan
  $results.GetEnumerator() | ForEach-Object {
    $color = if ($_.Value -eq 'OK') { 'Green' } elseif ($_.Value -eq 'skipped') { 'DarkGray' } else { 'Red' }
    Write-Host ("{0,-38} {1}" -f $_.Key, $_.Value) -ForegroundColor $color
  }
  if ($code -eq 0) { Write-Host "`nReady to merge into dev." -ForegroundColor Green }
  else { Write-Host "`nNot ready. Copy the red error text above and send it to Claude." -ForegroundColor Red }
  exit $code
}

# --- 1. verify.ps1
Step '1. Checks (verify.ps1)'
& pwsh -ExecutionPolicy Bypass -File scripts/verify.ps1
if ($LASTEXITCODE -ne 0) { $results['1. verify.ps1'] = 'FAILED'; Finish 1 }
$results['1. verify.ps1'] = 'OK'

# --- 2. start the apps (skip if they already run)
$urls = [ordered]@{
  'API'       = 'http://localhost:8080/health'
  'Worker'    = 'http://localhost:8082/health'
  'Website'   = 'http://localhost:3000/en'
  'Dashboard' = 'http://localhost:5173'
}
function Up($url) { try { (Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5).StatusCode -lt 500 } catch { $false } }

$devProcess = $null
$alreadyUp = @($urls.Values | Where-Object { Up $_ }).Count -eq $urls.Count
Step '2. Start the apps'
if ($alreadyUp) {
  Write-Host 'All apps are already running; using them.'
} else {
  Write-Host 'Starting "npx turbo run dev" in a new window (leave it open)...'
  $devProcess = Start-Process pwsh -PassThru -ArgumentList '-NoExit', '-Command', "Set-Location '$PWD'; npx turbo run dev"
}
$results['2. Start apps'] = 'OK'

# --- 3. wait until everything answers (first start compiles: up to 4 minutes)
Step '3. Wait until API, worker, website and dashboard answer'
$deadline = (Get-Date).AddMinutes(4)
do {
  $down = @($urls.GetEnumerator() | Where-Object { -not (Up $_.Value) } | ForEach-Object { $_.Key })
  if ($down.Count -eq 0) { break }
  Write-Host ("  waiting for: {0}" -f ($down -join ', '))
  Start-Sleep -Seconds 10
} while ((Get-Date) -lt $deadline)
if ($down.Count -gt 0) {
  $results['3. Apps answering'] = "FAILED ($($down -join ', '))"
  Write-Host 'Look at the second window for the error of the app that did not start.' -ForegroundColor Red
  Finish 1
}
# Warm up the website pages once, so the first test does not hit a cold Next.js compile.
foreach ($p in '/en', '/en/book', '/en/services', '/en/contact', '/da') { $null = Up "http://localhost:3000$p" }
$results['3. Apps answering'] = 'OK'

# --- 4. all end-to-end tests
Step '4. Playwright end-to-end tests (all)'
npx playwright test -c e2e
$e2e = $LASTEXITCODE
$results['4. End-to-end tests'] = if ($e2e -eq 0) { 'OK' } else { 'FAILED (npx playwright show-report e2e\playwright-report)' }

# --- 5. Docker images (optional, slow)
if ($Docker) {
  Step '5. Build the deploy images (like GitHub Actions)'
  $ok = $true
  docker build -f apps/api/Dockerfile -t eul/backend:check . ; if ($LASTEXITCODE -ne 0) { $ok = $false }
  docker build -f apps/website/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080 `
    --build-arg SITE_URL=http://localhost:3000 -t eul/web:check . ; if ($LASTEXITCODE -ne 0) { $ok = $false }
  docker build -f apps/dashboard/Dockerfile -t eul/dashboard:check . ; if ($LASTEXITCODE -ne 0) { $ok = $false }
  $results['5. Docker images'] = if ($ok) { 'OK' } else { 'FAILED' }
} else { $results['5. Docker images'] = 'skipped (add -Docker)' }

# --- 6. stop the apps we started
if ($devProcess -and -not $KeepRunning) {
  Step '6. Stop the apps'
  taskkill /PID $devProcess.Id /T /F | Out-Null
  Write-Host 'Stopped.'
}

$failed = @($results.Values | Where-Object { $_ -ne 'OK' -and $_ -notlike 'skipped*' }).Count
Finish ([int]($failed -gt 0))
