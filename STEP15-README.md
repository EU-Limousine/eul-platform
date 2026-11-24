# Step 15 — Pending website pages + enquiry API

Unzip over the repo root (code files only; no package.json changed).

## Run once (PowerShell, repo root)
```powershell
npm run db:migrate -- --name enquiries        # new "enquiries" table
# restart the API, then:
npm run api:generate                          # adds CreateEnquiryDto + hook to @eul/api-client
.\scripts\verify.ps1
npx playwright test -c e2e tests/pages.spec.ts
```

## .env (root)
ENQUIRY_EMAIL=info@eulimousine.com   # staff inbox; empty = enquiries are only stored

## apps/website/.env (optional)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=      # set in production; empty in dev

## New pages (all 7 languages, English text fallback)
/services, /services/{airport-transfers, hourly-chauffeur, city-to-city, vip-chauffeur,
events-weddings, tours, group-transport}, /business, /fleet, /service-areas, /about, /faq,
/contact, /blog (noindex placeholder), 404 and error pages. Sitemap + robots.txt updated.

## Still TODO(content)
- Danish and other translations of the `pages.*` texts (English shows until then).
- Company details in config/site.ts (About + Contact show them only when filled).
- Blog articles (needs the content module).
