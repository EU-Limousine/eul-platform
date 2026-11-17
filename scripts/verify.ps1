# EU Limousine: full local check. Run from the repo root:
#   pwsh -ExecutionPolicy Bypass -File scripts/verify.ps1
# Stops at the first failing step and tells you which one.

$ErrorActionPreference = 'Stop'
$steps = @(
  @{ name = '1. Docker (Postgres, Redis, Mailpit)'; cmd = 'docker compose up -d --wait' },
  @{ name = '2. Install dependencies';              cmd = 'npm install' },
  @{ name = '3. Prisma client';                     cmd = 'npm run db:generate' },
  @{ name = '4. Database migrations';               cmd = 'npx -w @eul/db prisma migrate deploy' },
  @{ name = '5. Seed data';                         cmd = 'npm run db:seed' },
  @{ name = '6. Typecheck (all apps)';              cmd = 'npx turbo run typecheck' },
  @{ name = '7. Lint (all apps)';                   cmd = 'npx turbo run lint' },
  @{ name = '8. Unit tests (all apps)';             cmd = 'npx turbo run test' },
  @{ name = '9. Production build (all apps)';       cmd = 'npx turbo run build' }
)

$results = @()
foreach ($s in $steps) {
  Write-Host "`n=== $($s.name) ===" -ForegroundColor Cyan
  $start = Get-Date
  Invoke-Expression $s.cmd
  $ok = ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE)
  $secs = [int]((Get-Date) - $start).TotalSeconds
  $results += [pscustomobject]@{ Step = $s.name; Result = $(if ($ok) { 'OK' } else { 'FAILED' }); Seconds = $secs }
  if (-not $ok) {
    $results | Format-Table -AutoSize
    Write-Host "Stopped at: $($s.name). Copy the red error text above and send it to Claude." -ForegroundColor Red
    exit 1
  }
}

$results | Format-Table -AutoSize
Write-Host 'All checks passed. Next: start the apps (npx turbo run dev) and run scripts/smoke-test.ps1.' -ForegroundColor Green