# UI tests (Playwright)

End-to-end tests of the website, the dashboard and the booking → dispatch flow, in a real browser.

## One-time setup (repo root)

```powershell
npm install -D @playwright/test
npx playwright install chromium
```

Add to `.gitignore`:

```
e2e/test-results/
e2e/playwright-report/
```

## Run

Start everything first (two windows):

```powershell
docker compose up -d
npx turbo run dev
```

Then:

| What | Command |
|---|---|
| All tests | `npx playwright test -c e2e` |
| One file | `npx playwright test -c e2e booking` |
| Watch it in a browser | `npx playwright test -c e2e --headed` |
| Step through, pick tests | `npx playwright test -c e2e --ui` |
| Phone tests only | `npx playwright test -c e2e --project=mobile` |
| Open the report | `npx playwright show-report e2e/playwright-report` |

Failures keep a screenshot, a video and a trace in the report (click a failed test → Trace).

## What is covered

| File | User cases |
|---|---|
| `website.spec.ts` | Home page, browser language detection (de → /de, unknown → /en), language switcher + remembered choice, switching keeps the booking page, booking page in all 7 languages, 5 legal pages with draft warning, 404, hreflang links |
| `booking.spec.ts` | Empty-form errors, same pickup/drop-off refused, keyboard address search, details validation, full booking + test payment + confirmation + email, failed payment, booking on a phone (`@mobile`) |
| `dashboard-auth.spec.ts` | Redirect to login, show/hide password, theme on login screen, wrong password, login + reload + logout |
| `dashboard.spec.ts` | Overview cards/charts, every sidebar screen, dark mode remembered, Ctrl+K search, bell, sidebar collapse, quick access add driver, add vehicle, form validation, add driver, pricing, status tabs, phone-sized menu |
| `booking-to-dispatch.spec.ts` | Customer books and pays on the website → dispatcher finds it as unassigned → adds vehicle + chauffeur → assigns → overview + activity updated → "chauffeur" email sent |

Tests create data in the **local** database (bookings, vehicles, drivers named `E2E …`). Never run against production.
