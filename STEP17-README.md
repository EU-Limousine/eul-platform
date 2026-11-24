# Step 17 — Cookie consent (website)

Apply after steps 15, 15b and 16. Unzip over the repo root (code files only; no package.json changed).
No database or API changes.

## How it works
- Today the site only uses necessary storage (language cookie, booking draft, security check),
  which needs no consent. So by default there is NO banner.
- When an optional tool is added (e.g. analytics), set in apps/website/.env (and in Cloud Run):
    NEXT_PUBLIC_CONSENT_CATEGORIES=statistics        # or: statistics,marketing
  Then the banner appears: Accept all / Reject all (same look) / Choose cookies.
- The choice is stored in the `eul_consent` cookie for 12 months (bump CONSENT_VERSION in
  src/features/consent/consent.ts when tools change: everyone is asked again).
- "Cookie settings" in the footer lets visitors change or withdraw consent; withdrawing reloads the page.
- Load any optional script ONLY inside the gate:
    <ConsentGate category="statistics"><YourAnalytics /></ConsentGate>
  (import from '@/features/consent/consent-provider').

## Try it locally
```powershell
# apps/website/.env
NEXT_PUBLIC_CONSENT_CATEGORIES=statistics
# restart the website (NEXT_PUBLIC_* is read at start/build), then:
npx playwright test -c e2e tests/cookie-consent.spec.ts
```
With the setting empty, the same test file checks that there is no banner instead.

## Before analytics go live (TODO(content), lawyer)
- Name each tool in the cookie policy: what it stores, for how long, who receives the data.
- Decide whether consent must also be logged server-side (proof of consent).
