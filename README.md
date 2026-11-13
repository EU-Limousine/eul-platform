# EU Limousine Platform

Booking and dispatch platform for EU Limousine (Copenhagen). Rules for every change: **CLAUDE.md** (wins over older documents).

| Part | Path | Local URL |
|---|---|---|
| API (NestJS) | `apps/api` | http://localhost:8080 · docs at `/docs` |
| Worker (BullMQ) | `apps/worker` | http://localhost:8082/health |
| Dashboard (Vite + React) | `apps/dashboard` | http://localhost:5173 |
| Website (Next.js, 7 languages) | `apps/website` | http://localhost:3000 |
| Database (Prisma, Postgres 17) | `packages/db` | localhost:5433 |
| Test inbox (Mailpit) | docker compose | http://localhost:8025 |

## First-time setup (Windows, PowerShell 7)

Needs Node 22 (`nvm use 22`) and Docker Desktop running.

```powershell
git init; git branch -M main
Copy-Item .env.example .env       # then edit SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
pwsh ./setup.ps1                  # installs packages, starts Docker, migrates, seeds, runs checks
git add -A; git commit -m "chore: platform foundation"
```

Then copy your latest `CLAUDE.md` into the repo root and your HTML designs into `designs/`.

## Every day

```powershell
docker compose up -d
npx turbo run dev                 # all apps; or --filter=@eul/api / @eul/dashboard / @eul/website / @eul/worker
```

Log in to the dashboard with the `SEED_ADMIN_*` account from `.env`.

## Commands

```powershell
npm run db:migrate -- --name <change>   # new migration (local only)
npm run db:generate                     # regenerate Prisma client
npm run db:seed
npm run db:studio
npm run api:generate                    # Orval: regenerate packages/api-client (API must be running)
npx turbo run typecheck test build
```

Never run plain `npx prisma` from the root (it downloads another Prisma version). Use the npm scripts.

## What is in this foundation

- **Database:** full Phase 1A/1B schema — staff users with multiple roles, separate customers, refresh tokens, audit log, vehicle categories, vehicles, drivers, spare days, pricing rules, quotes, checkout sessions, payments, payment events, refunds, bookings, status history, offers, assignments, dispatch settings, notification log. Seed: first Super Admin, fleet categories from the spreadsheet (unconfirmed, D-09), demo EUR prices (unconfirmed, D-06), dispatch settings.
- **API:** login / refresh (rotating cookie, reuse detection) / logout / me; permission matrix from CLAUDE.md §4.5 incl. `DEVELOPER`; role-grant rules and last-Super-Admin protection; users list/create/set roles/deactivate; audit service; standard error shape; request IDs; rate limiting; health check; Swagger.
- **Worker:** email queue → SMTP `EmailSender` → `notification_logs`; health check.
- **Dashboard:** login, session restore from refresh cookie, access token in memory only, permission-based menu, Copenhagen clock (no hard-coded CET), runtime `config.js`, nginx with security headers.
- **Website:** 7 languages, browser detection + saved choice + switcher that keeps the page, English fallback, hreflang, fonts self-hosted.
- **Docker** files for all four services and a GitHub Actions CI.

## Not yet built (next)

Quotes, checkout with `FakePaymentProvider`, bookings list and manual assignment, booking flow on the website, driver app (Expo), dispatch offers, deployment to Google Cloud.
