# Deploying EU Limousine to Google Cloud

Two Google Cloud projects in `europe-west1` (CLAUDE.md D-14), identical except for size:

| | Staging | Production |
|---|---|---|
| Project id | `eu-limo-staging` | `eu-limo` |
| Website | `staging.eulimousine.com` | `eulimousine.com` (+ `www` → 301) |
| Dashboard | `app-staging.eulimousine.com` | `app.eulimousine.com` |
| API | `api-staging.eulimousine.com` | `api.eulimousine.com` |
| Database | `db-g1-small` (shared core), 7 backups | `db-custom-1-3840` (1 vCPU, 3.75 GB), 14 backups + point-in-time recovery |
| API / website when idle | scale to zero | 1 warm instance each |
| Search engines | `X-Robots-Tag: noindex` on every response | indexed |
| Deploys | automatically after CI on `main` | same commit, after **your approval** in GitHub |

Every script takes `EUL_ENV=staging` or `EUL_ENV=production` (default **staging**, so nothing reaches
production by accident). The domain is registered at **Hostinger**, DNS is at **Cloudflare** with every
record *DNS only* (grey cloud), staff email stays on **Hostinger Email** (D-19).

Run the scripts in **Google Cloud Shell** (console.cloud.google.com → the `>_` icon). It is already
logged in as you, so generated secrets never leave Google Cloud. Never paste a secret into chat,
the repo or GitHub.

> Replaces the October "GCP Setup and Docker Deployment Guide" (Cloudflare proxy, Cloudflare Pages,
> Postmark, Cloud Run domain mapping). This folder is the source of truth for deploying.

## What gets created (in each project)

| Piece | Name | Notes |
|---|---|---|
| Website | Cloud Run `eul-web` | Next.js standalone |
| Dashboard | Cloud Run `eul-dashboard` | nginx |
| API | Cloud Run `eul-api` | NestJS |
| Worker | Cloud Run `eul-worker` | BullMQ (emails, timers), private, always on, exactly 1 instance |
| Migrations / seed | Cloud Run jobs `eul-migrate`, `eul-seed` | every deploy / first deploy only |
| Database | Cloud SQL `eul-pg`, PostgreSQL 17 | no authorised networks; reached only via the Cloud SQL connector |
| Queues | Memorystore `eul-redis`, Redis 7.2, 1 GB | `noeviction`, AUTH on, private network only |
| Images | Artifact Registry `eul` | keeps the 10 newest images per package |
| HTTPS | Load balancer `eul-lb` + Google-managed certificate | one IP for all host names |
| Secrets | Secret Manager (EU only) | each service reads only its own |

Every resource carries the labels `app=eulimousine`, `env=<staging|production>` and
`component=<api|worker|website|dashboard|database|redis|images|migrate|seed>`, so Billing → Reports
can show the cost of each part.

**Why the database has a public IP with no authorised networks** (the October guide said private IP only):
nobody can connect to that IP directly; Cloud Run reaches the database only through Google's Cloud SQL
connector (a Unix socket, encrypted and IAM-checked with the `cloudsql.client` role). A private-IP TCP
connection would need `sslmode=require`, which the Node `pg` driver now treats as full certificate
verification, and that fails against Cloud SQL's own certificate authority without shipping its CA file.

Cloud Run's own domain mapping is **not** used: Google marks it Preview and not recommended for
production. The load balancer is the supported way and also carries WebSockets for the live dispatch map.

## One-time setup — do STAGING first, then repeat for PRODUCTION

**0. Before you start**
- Both projects exist with billing linked ✔.
- Set `GITHUB_REPO` in `config.sh` and push the repo to GitHub.
- In Hostinger → Emails: the mailboxes `bookings@` (sends system emails) and `info@` (receives website enquiries) exist.
- In **each** project: a Google Maps **server key** (APIs & Services → Credentials), restricted to
  *Places API (New)* and *Routes API*. One key per project means Maps costs show up per environment.
- Optional now, required for launch: a Cloudflare **Turnstile** widget with hostnames
  `eulimousine.com` and `staging.eulimousine.com` (site key + secret key).

**1. Budget alerts** (first, so you are warned before anything costs much)
```bash
git clone https://github.com/<owner>/<repo>.git && cd <repo>
EUL_ENV=staging    bash infrastructure/gcp/budgets.sh
EUL_ENV=production bash infrastructure/gcp/budgets.sh
```
Defaults: 150 USD staging, 250 USD production (see *Costs* below). If your billing account is not in
USD the script asks for `BUDGET=<amount in your currency>`.

**2. Foundation** — APIs, network, database, Redis, registry, service accounts (≈15 min, mostly waiting)
```bash
EUL_ENV=staging bash infrastructure/gcp/1-foundation.sh
```

**3. Secrets** — generates the database password and JWT secret; asks (hidden input) for the SMTP
password, Maps server key, Turnstile secret and the first admin's password
```bash
EUL_ENV=staging bash infrastructure/gcp/2-secrets.sh
```

**4. GitHub deploys** — Workload Identity Federation (no keys); prints the GitHub variables
```bash
EUL_ENV=staging bash infrastructure/gcp/3-github.sh
```
In GitHub → Settings → Environments create **staging** (no reviewers) and add the printed variables.

**5. First deploy** — GitHub → Actions → **Deploy** → *Run workflow* → target **staging**, tick **seed** → Run.
It builds the images, runs the migrations, creates the first admin (`admin@eulimousine.com` unless you
set `SEED_ADMIN_EMAIL`) and deploys all four services.

**6. Domains** — load balancer + certificate, then the DNS records it prints, in Cloudflare
```bash
EUL_ENV=staging bash infrastructure/gcp/4-load-balancer.sh
```
Add the **A records** it prints in **Cloudflare → DNS**, each **DNS only (grey cloud)**. Keep every
MX / TXT / mail record. After 15–60 min the certificate is ACTIVE and the staging URLs work.

**7. Monitoring** — production only (staging would alert every night while it sleeps)
```bash
EUL_ENV=production ALERT_EMAIL=you@eulimousine.com bash infrastructure/gcp/5-monitoring.sh
```

**8. Test staging end to end** (book a ride with the test payment page, see it in the dashboard,
check the emails arrive). Then **repeat steps 2–6 with `EUL_ENV=production`, then step 7**: in step 4 create the
GitHub environment **production** with yourself as *Required reviewer*; in step 5 choose target
**staging-then-production** with **seed** ticked.

**9. Acceptance check 13 — backup restore** (production, once there is some data)
```bash
EUL_ENV=production bash infrastructure/gcp/6-backup-restore-test.sh <image tag of the current release>
```

## Every release after that

Merge to `main` → CI passes → **staging** deploys automatically → you test → approve **production**
in GitHub (Actions → the run → *Review deployments*) → the same commit deploys to production.
Each deploy runs `prisma migrate deploy` first; a failed migration stops the release before any
service changes. All service settings live in `deploy.sh`.

**Roll back** (code only): Console → Cloud Run → service → Revisions → route 100 % to the previous one,
or re-run the Deploy workflow on an older commit. Migrations are never rolled back automatically;
use expand → migrate → contract for breaking schema changes (CLAUDE.md §5 Database).

## Costs (estimate, November 2026, on-demand list prices in USD)

Based on Google's list prices (Tier-1 region rates; `europe-west1` can be a few percent higher),
before taxes and before the small Cloud Run free tier (shared by both projects).
**Not included:** Google Maps API calls (billed per request — set quotas in APIs & Services), the
payment provider's fees, Hostinger email, and traffic far beyond a starting business.

| Part | Production | Staging, always on | Staging with nightly/weekend sleep |
|---|---|---|---|
| Database (Cloud SQL) | ≈ 52 (1 vCPU 3.75 GB + 10 GB SSD + backups) | ≈ 28 (`db-g1-small`) | ≈ 10 (disk only while asleep) |
| Redis (Memorystore Basic 1 GB) | ≈ 36 | ≈ 36 | ≈ 36 (cannot be paused) |
| Worker (always on, 1 vCPU) | ≈ 50 | ≈ 50 | ≈ 15 |
| API + website (1 warm instance each in production) | ≈ 25 | ≈ 2 | ≈ 2 |
| Dashboard (scales to zero) | ≈ 1 | ≈ 1 | ≈ 1 |
| Load balancer (+ traffic) | ≈ 20 | ≈ 20 | ≈ 20 |
| Images, secrets, logs, monitoring | ≈ 5 | ≈ 3 | ≈ 3 |
| **Total per month** | **≈ 190 USD** | **≈ 140 USD** | **≈ 85 USD** |

So plan for **about 275–330 USD a month for both projects** while the business starts, and set the
budgets to **250 USD (production)** and **150 USD (staging)**. Revisit after the first two invoices.

Ways to spend less, from biggest to smallest:
1. **Sleep staging** when nobody tests (saves ≈ 55 USD/month):
   `bash infrastructure/gcp/staging-sleep.sh` · `bash infrastructure/gcp/staging-sleep.sh wake`
   (a deploy wakes it automatically).
2. **Committed-use discounts** once usage is stable (1 or 3 years) on Cloud SQL, Memorystore and
   Cloud Run — only after a few months of real bills.
3. Production API/website at 0 warm instances saves ≈ 25 USD but customers then wait a few seconds
   on the first visit after a quiet period. Not recommended for a premium brand.

Where to watch: **Console → Billing → Reports** → filter by project, *Group by → Service*, or by
label `component` to see each part. **Billing → Budgets & alerts** for the alert emails.

## Pre-launch vs launch

`config.sh` starts with `PRELAUNCH_MODE=true` and `PAYMENT_PROVIDER=fake`: the full flow works with the
test payment page and no money moves. Staging always stays like this. For the real production launch:
1. Payment provider chosen (D-01) and its adapter built; its secrets added to the production project.
2. A real Turnstile secret + `TURNSTILE_SITE_KEY` variable in the GitHub **production** environment.
3. In `config.sh`, production: `PRELAUNCH_MODE=false`, `PAYMENT_PROVIDER=<provider>` → merge → approve.
The API refuses to start in production with the fake provider or the Turnstile test secret unless
`PRELAUNCH_MODE=true`, so this cannot be forgotten silently.

**Until then, do not publish the production DNS records** if you do not want the public to find a
site whose payments are test payments: stop production after step 5 (it answers only on its internal
`run.app` addresses) and run step 6 for production when you are ready to open.

## Email (Hostinger SMTP)

System emails are sent by the worker as `bookings@eulimousine.com` through `smtp.hostinger.com:465`
(both environments; staging sends real emails, so test with your own addresses). Hostinger's SPF/DKIM
records (now in Cloudflare DNS) already cover mail sent through Hostinger. Recommended before launch:
a **DMARC** TXT record `_dmarc` → `v=DMARC1; p=none; rua=mailto:info@eulimousine.com`
(Cloudflare → DNS, DNS only). If you later switch to a dedicated sender (D-20), merge its include
into the **one** SPF record.

## Changing a secret

```bash
gcloud config set project eu-limo-staging      # or eu-limo
printf %s 'NEW VALUE' | gcloud secrets versions add smtp-pass --data-file=-
```
Then re-run the Deploy workflow (services read `:latest` at start).
