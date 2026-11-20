#Requires -Version 7
<#
  EU Limousine: demo fleet + chauffeurs for a LOCAL demo. Uses the real API (validation, password hashing, audit log).
  Needs the API running (npx turbo run dev). Safe to run twice: existing demo items are skipped.

    pwsh -ExecutionPolicy Bypass -File scripts/seed-demo.ps1
    pwsh -ExecutionPolicy Bypass -File scripts/seed-demo.ps1 -WithDkkPrices   # also DKK demo prices (Danish site)

  Everything created is marked as demo: plates "DEMO 0x", names "(demo)", emails @example.com, phones +45 00 ...
  (not real numbers). Prices and vehicles stay "Not confirmed" (decision D-09). Never run against production.
#>
param([switch] $WithDkkPrices)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$Api = 'http://localhost:8080'

# Admin login from .env
$envMap = @{}
Get-Content .env | Where-Object { $_ -match '^\s*[A-Z0-9_]+\s*=' } | ForEach-Object {
  $k, $v = $_ -split '=', 2; $envMap[$k.Trim()] = $v.Trim().Trim('"').Trim("'")
}
function Call($method, $path, $body = $null) {
  $p = @{ Method = $method; Uri = "$Api$path"; Headers = $script:auth; SkipHttpErrorCheck = $true; StatusCodeVariable = 'code' }
  if ($body) { $p.Body = ($body | ConvertTo-Json -Depth 10); $p.ContentType = 'application/json' }
  $r = Invoke-RestMethod @p
  if ($code -ge 400) { throw "$method $path → $code $($r.message)" }
  return $r
}

$script:auth = @{}
$login = Call POST '/auth/login' @{ email = $envMap.SEED_ADMIN_EMAIL; password = $envMap.SEED_ADMIN_PASSWORD; app = 'dashboard' }
$script:auth = @{ Authorization = "Bearer $($login.accessToken)" }
Write-Host "Logged in as $($login.user.email)" -ForegroundColor Cyan

# ── Vehicle classes ──
$cats = @{}
(Call GET '/vehicle-categories') | ForEach-Object { $cats[$_.code] = $_ }

# ── Demo vehicles: one per class, models from the fleet spreadsheet ──
$demoVehicles = @(
  @{ code = 'ELECTRIC';             make = 'Mercedes-Benz'; model = 'EQS 350';  plate = 'DEMO 01' },
  @{ code = 'BUSINESS';             make = 'Mercedes-Benz'; model = 'E-Class';  plate = 'DEMO 02' },
  @{ code = 'FIRST';                make = 'Mercedes-Benz'; model = 'S-Class';  plate = 'DEMO 03' },
  @{ code = 'PREMIUM_ELECTRIC_VAN'; make = 'Mercedes-Benz'; model = 'EQV';      plate = 'DEMO 04' },
  @{ code = 'PREMIUM_MINIVAN';      make = 'Mercedes-Benz'; model = 'V-Class';  plate = 'DEMO 05' },
  @{ code = 'GROUP_SHUTTLE';        make = 'Mercedes-Benz'; model = 'Sprinter'; plate = 'DEMO 06' },
  @{ code = 'LUXURY_COACH';         make = 'Mercedes-Benz'; model = 'Tourismo'; plate = 'DEMO 07' }
)
$existing = (Call GET '/vehicles?search=DEMO&pageSize=100').items
$plateToId = @{}
$existing | ForEach-Object { $plateToId[$_.plate] = $_.id }

Write-Host "`nVehicles" -ForegroundColor Cyan
foreach ($v in $demoVehicles) {
  $cat = $cats[$v.code]
  if (-not $cat) { Write-Host "  skip $($v.plate): class $($v.code) not found" -ForegroundColor Yellow; continue }
  if ($plateToId[$v.plate]) { Write-Host "  exists  $($v.plate)  $($v.model)  ($($cat.name))"; continue }
  $created = Call POST '/vehicles' @{ categoryId = $cat.id; make = $v.make; model = $v.model; plate = $v.plate; color = 'Black' }
  $plateToId[$v.plate] = $created.id
  Write-Host "  created $($v.plate)  $($v.model)  ($($cat.name))" -ForegroundColor Green
}

# ── Demo chauffeurs, each with a default vehicle ──
$password = 'Demo-Chauffeur-2026!'
$demoDrivers = @(
  @{ name = 'Anders Jensen (demo)';   email = 'demo.chauffeur1@example.com'; phone = '+45 00 00 00 01'; plate = 'DEMO 01'; type = 'EMPLOYEE' },
  @{ name = 'Mette Nielsen (demo)';   email = 'demo.chauffeur2@example.com'; phone = '+45 00 00 00 02'; plate = 'DEMO 02'; type = 'EMPLOYEE' },
  @{ name = 'Lars Hansen (demo)';     email = 'demo.chauffeur3@example.com'; phone = '+45 00 00 00 03'; plate = 'DEMO 03'; type = 'EMPLOYEE' },
  @{ name = 'Sofie Pedersen (demo)';  email = 'demo.chauffeur4@example.com'; phone = '+45 00 00 00 04'; plate = 'DEMO 05'; type = 'CONTRACTOR' },
  @{ name = 'Jonas Andersen (demo)';  email = 'demo.chauffeur5@example.com'; phone = '+45 00 00 00 05'; plate = 'DEMO 06'; type = 'CONTRACTOR' }
)
$existingDrivers = (Call GET '/drivers?search=demo.chauffeur&pageSize=100').items
$emails = @{}
$existingDrivers | ForEach-Object { $emails[$_.email] = $_.id }

Write-Host "`nChauffeurs (password for all: $password)" -ForegroundColor Cyan
$driverIds = @()
foreach ($d in $demoDrivers) {
  if ($emails[$d.email]) { $driverIds += $emails[$d.email]; Write-Host "  exists  $($d.name)"; continue }
  $body = @{ name = $d.name; email = $d.email; password = $password; workPhone = $d.phone; driverType = $d.type }
  if ($plateToId[$d.plate]) { $body.vehicleId = $plateToId[$d.plate] }
  $created = Call POST '/drivers' $body
  $driverIds += $created.id
  Write-Host "  created $($d.name)  →  $($d.plate)" -ForegroundColor Green
}

# ── Spare chauffeurs for tomorrow (Copenhagen date) ──
$tomorrow = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId((Get-Date).ToUniversalTime().AddDays(1), 'Romance Standard Time').ToString('yyyy-MM-dd')
Call PUT '/dispatch/spares' @{ date = $tomorrow; driverIds = @($driverIds | Select-Object -Last 2) } | Out-Null
Write-Host "`nSpare chauffeurs set for $tomorrow (last 2 demo chauffeurs)" -ForegroundColor Cyan

# ── Optional: DKK demo prices so the Danish site (defaults to DKK) shows vehicles ──
if ($WithDkkPrices) {
  Write-Host "`nDKK demo prices (EUR × 7.46, rounded to 50 kr, NOT confirmed)" -ForegroundColor Cyan
  $rules = Call GET '/pricing/rules'
  foreach ($eur in ($rules | Where-Object { $_.currency -eq 'EUR' })) {
    if ($rules | Where-Object { $_.categoryId -eq $eur.categoryId -and $_.currency -eq 'DKK' }) { Write-Host "  exists  DKK for $($eur.categoryName)"; continue }
    $toDkk = { param($m) [int]([math]::Round(($m * 7.46) / 5000) * 5000) }   # minor units, nearest 50 kr
    Call POST '/pricing/rules' @{
      categoryId = $eur.categoryId; currency = 'DKK'
      baseFareMinor = (& $toDkk $eur.baseFareMinor); perKmMinor = (& $toDkk $eur.perKmMinor)
      perMinuteMinor = (& $toDkk $eur.perMinuteMinor); minimumFareMinor = (& $toDkk $eur.minimumFareMinor)
      isActive = $true; isConfirmed = $false
    } | Out-Null
    Write-Host "  created DKK for $($eur.categoryName)" -ForegroundColor Green
  }
}

Write-Host "`nDemo data ready. Book on the website, then assign one of the '(demo)' chauffeurs in the dashboard." -ForegroundColor Green
