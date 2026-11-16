# API tests (Postman + Newman)

| File | What |
|---|---|
| `eul-api.postman_collection.json` | 51 requests with automatic checks, in 5 folders |
| `local.postman_environment.json` | `http://localhost:8080`, writes allowed |
| `prod.postman_environment.json` | `https://api.eulimousine.com`, **read-only** |
| `../scripts/api-tests.ps1` | Runs everything from the command line and writes reports |

## Run automatically

```powershell
npm install -D newman newman-reporter-htmlextra     # once
pwsh -ExecutionPolicy Bypass -File scripts/api-tests.ps1               # local, all checks
pwsh -ExecutionPolicy Bypass -File scripts/api-tests.ps1 -Target prod  # production, read-only
```

Reports: `postman/reports/` (HTML to open in a browser, JUnit XML for CI). Add `postman/reports/` to `.gitignore`.

## Use in the Postman app

1. Import the collection and both environment files.
2. Pick the environment top right, and type the admin password into `adminPassword` (Current value only, so it is never synced or exported).
3. Collection → Run → Run EU Limousine API. Keep the order; requests pass IDs to each other.

## Folders

| Folder | Checks | Runs on |
|---|---|---|
| 00 Public and health | health, public vehicle classes, address search, quote, too-soon pickup, validation error shape, no stack traces | local + prod |
| 01 Auth and permissions | 401 without/with bad token, wrong password, login, refresh cookie is HttpOnly, me, token refresh | local + prod |
| 02 Dashboard reads | overview, bookings (pagination, limits, unknown fields, 404), vehicles, drivers, pricing + price check, spares, users | local + prod |
| 03 Booking and dispatch flow | quote → checkout (idempotency) → test payment → booking PAID → vehicle + driver → driver blocked from dashboard → candidates → spares → assign → second assign 409 → both emails in Mailpit → failed payment creates no booking | **local only** (`allowWrites = true`) |
| 04 Logout | logout, refresh refused after logout | local + prod |

## Production notes

- Use a **dispatcher test account**, not the super admin. The script asks for the password and never saves it.
- Once the real Turnstile key is live, public quote requests without a widget token return 403. The checks accept that on production and show "Turnstile protects public quotes".
- Each run uses 2 logins (limit: 10 per minute).
- Folder 03 needs the test payment provider, so it can never run on production with a real payment provider.
