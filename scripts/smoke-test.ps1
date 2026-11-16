#Requires -Version 7
<#
  EU Limousine — end-to-end smoke test of the local API (PowerShell 7).
  Needs: docker compose up -d, and API + worker running (npx turbo run dev --filter=@eul/api --filter=@eul/worker).
  Run from the repo root:   pwsh ./scripts/smoke-test.ps1
  Creates test data in the LOCAL database (a vehicle, a driver, a booking). Never run against production.
#>
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$Api = 'http://localhost:8080'
$Mail = 'http://localhost:8025'
$script:failed = 0

function Pass($text) { Write-Host "  PASS  $text" -ForegroundColor Green }
function Fail($text) { Write-Host "  FAIL  $text" -ForegroundColor Red; $script:failed++ }
function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Check($ok, $text) { if ($ok) { Pass $text } else { Fail $text } }
# Creating something answers 201 Created (some endpoints answer 200); both are success.
function Created($status) { return $status -in 200, 201 }

# Read the admin login from .env
$envFile = Get-Content .env | Where-Object { $_ -match '^\s*[A-Z_]+=' }
$envMap = @{}
foreach ($line in $envFile) { $k, $v = $line -split '=', 2; $envMap[$k.Trim()] = $v.Trim().Trim('"') }

function Call($method, $path, $body = $null, $headers = @{}) {
  $params = @{ Method = $method; Uri = "$Api$path"; Headers = $headers; SkipHttpErrorCheck = $true; StatusCodeVariable = 'code' }
  if ($body) { $params.Body = ($body | ConvertTo-Json -Depth 10); $params.ContentType = 'application/json' }
  $result = Invoke-RestMethod @params
  return [pscustomobject]@{ Status = [int]$code; Body = $result }
}

Step '1. Services are up'
$health = Call GET '/health'
Check ($health.Status -eq 200) "API /health ($($health.Status))"
try { $w = Invoke-RestMethod 'http://localhost:8082/health'; Check ($w.status -eq 'ok') 'Worker /health' } catch { Fail 'Worker /health (is the worker running?)' }
try { Invoke-RestMethod "$Mail/api/v1/messages" | Out-Null; Pass 'Mailpit' } catch { Fail 'Mailpit (docker compose up -d)' }
if ($script:failed) { Write-Host "`nStart the missing services first." -ForegroundColor Yellow; exit 1 }

Step '2. Login and permissions'
$noToken = Call GET '/users'
Check ($noToken.Status -eq 401) "No token → 401 ($($noToken.Status))"
$login = Call POST '/auth/login' @{ email = $envMap.SEED_ADMIN_EMAIL; password = $envMap.SEED_ADMIN_PASSWORD; app = 'dashboard' }
Check ($login.Status -eq 200) "Admin login ($($login.Status))"
if ($login.Status -ne 200) { exit 1 }
$auth = @{ Authorization = "Bearer $($login.Body.accessToken)" }
Check ($login.Body.user.permissions -contains 'dispatch.assign') 'Super Admin has dispatch.assign'
$wrongPw = Call POST '/auth/login' @{ email = $envMap.SEED_ADMIN_EMAIL; password = 'wrong-password-123'; app = 'dashboard' }
Check ($wrongPw.Status -eq 401) "Wrong password → 401 ($($wrongPw.Status))"

Step '3. Fleet, pricing, drivers'
$cats = Call GET '/vehicle-categories' $null $auth
Check ($cats.Status -eq 200 -and $cats.Body.Count -ge 1) "Vehicle categories: $($cats.Body.Count)"
$rules = Call GET '/pricing/rules' $null $auth
Check ($rules.Status -eq 200 -and $rules.Body.Count -ge 1) "Pricing rules: $($rules.Body.Count)"

Step '4. Quote'
$pickupAt = (Get-Date).ToUniversalTime().AddDays(2).ToString('yyyy-MM-ddTHH:mm:00Z')
$quote = Call POST '/public/quotes' @{
  pickup = @{ address = 'Copenhagen Airport (CPH)'; lat = 55.618; lng = 12.6476 }
  dropoff = @{ address = 'Copenhagen Central Station'; lat = 55.6727; lng = 12.5644 }
  pickupAt = $pickupAt; passengers = 2
}
Check ($quote.Status -eq 200 -and $quote.Body.options.Count -ge 1) "Quote options: $($quote.Body.options.Count) (distance $($quote.Body.distanceMeters) m, $($quote.Body.distanceSource))"
$tooSoon = Call POST '/public/quotes' @{
  pickup = @{ address = 'A'; lat = 55.618; lng = 12.6476 }; dropoff = @{ address = 'B'; lat = 55.6727; lng = 12.5644 }
  pickupAt = (Get-Date).ToUniversalTime().AddMinutes(5).ToString('yyyy-MM-ddTHH:mm:00Z'); passengers = 2
}
Check ($tooSoon.Status -eq 422) "Pickup too soon → 422 ($($tooSoon.Status))"
$option = $quote.Body.options[0]

Step '5. Checkout and test payment'
$key = "smoke-$([guid]::NewGuid().ToString('N'))"
$checkoutBody = @{
  quoteId = $option.quoteId
  customer = @{ name = 'Smoke Test'; email = 'smoke-test@example.com'; phone = '+45 12345678' }
  language = 'en'
}
$checkout = Call POST '/public/checkouts' $checkoutBody @{ 'Idempotency-Key' = $key }
Check ((Created $checkout.Status) -and $checkout.Body.redirectUrl) "Checkout created ($($checkout.Status))"
$again = Call POST '/public/checkouts' $checkoutBody @{ 'Idempotency-Key' = $key }
Check ($again.Body.checkoutId -eq $checkout.Body.checkoutId) 'Same Idempotency-Key → same checkout'

$paymentId = ($checkout.Body.redirectUrl -split '/')[-1]
$pay = Invoke-WebRequest -Method POST -Uri "$Api/fake-pay/$paymentId/pay" -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue
Check ($pay.StatusCode -eq 303) "Fake payment 'Pay' → redirect to website ($($pay.StatusCode))"

$status = Call GET "/public/checkouts/$($checkout.Body.checkoutId)"
$reference = $status.Body.bookingReference
Check ($status.Body.status -eq 'PAID' -and $reference) "Booking created: $reference"

Step '6. Booking in the dashboard API'
$list = Call GET "/bookings?search=$reference" $null $auth
$booking = $list.Body.items | Select-Object -First 1
Check ($booking -and $booking.status -eq 'NEW') "Booking in list with status NEW"
$detail = Call GET "/bookings/$($booking.id)" $null $auth
Check ($detail.Body.payment.status -eq 'PAID') 'Payment recorded as PAID'
Check ($detail.Body.history.Count -ge 1) 'Status history recorded'

Step '7. Driver and manual assignment'
$plate = "SMK $(Get-Random -Minimum 1000 -Maximum 9999)"
$vehicle = Call POST '/vehicles' @{ categoryId = $option.category.id; make = 'Test'; model = 'Smoke'; plate = $plate } $auth
Check (Created $vehicle.Status) "Test vehicle created ($plate, $($vehicle.Status))"
$driverEmail = "smoke-driver-$(Get-Random)@example.com"
$driver = Call POST '/drivers' @{ email = $driverEmail; name = 'Smoke Driver'; password = 'smoke-test-password-1'; workPhone = '+45 87654321'; vehicleId = $vehicle.Body.id } $auth
Check (Created $driver.Status) "Test driver created ($($driver.Status))"

$candidates = Call GET "/bookings/$($booking.id)/driver-candidates" $null $auth
Check (($candidates.Body | Where-Object driverId -eq $driver.Body.id)) 'Driver appears in candidates'

$assign = Call POST "/bookings/$($booking.id)/assign" @{ driverId = $driver.Body.id } $auth
Check ((Created $assign.Status) -and $assign.Body.status -eq 'ASSIGNED') "Assigned ($($assign.Status))"
$assign2 = Call POST "/bookings/$($booking.id)/assign" @{ driverId = $driver.Body.id } $auth
Check ($assign2.Status -eq 409) "Second assignment → 409 'no longer available' ($($assign2.Status))"

$driverLogin = Call POST '/auth/login' @{ email = $driverEmail; password = 'smoke-test-password-1'; app = 'dashboard' }
Check ($driverLogin.Status -eq 403) "Driver cannot log in to the dashboard → 403 ($($driverLogin.Status))"

Step '8. Emails (worker → Mailpit)'
Start-Sleep -Seconds 3
$messages = (Invoke-RestMethod "$Mail/api/v1/messages?limit=50").messages | Where-Object { $_.Subject -like "*$reference*" }
Check ($messages | Where-Object { $_.Subject -like '*booking received*' }) "'Booking received' email"
Check ($messages | Where-Object { $_.Subject -like '*booking confirmed*' }) "'Booking confirmed — your chauffeur' email"

Write-Host ''
if ($script:failed -eq 0) { Write-Host 'ALL CHECKS PASSED' -ForegroundColor Green }
else { Write-Host "$($script:failed) CHECK(S) FAILED" -ForegroundColor Red; exit 1 }