# Deploying EU Limousine to Google Cloud

Everything runs in **one Google Cloud project in `europe-west1`** (CLAUDE.md D-14). The domain is
registered at **Hostinger**, its **DNS is at Cloudflare** with every record *DNS only* (grey cloud),
and staff email stays on **Hostinger Email** (D-19). Run the numbered scripts **in Google Cloud Shell**
(console.cloud.google.com → the `>_` icon): it already has `gcloud`, is logged in as you, and keeps
every secret inside Google Cloud. Never paste a secret into chat, a file in the repo or GitHub.

> Replaces the October "GCP Setup and Docker Deployment Guide" (Cloudflare proxy, Cloudflare Pages,
> Postmark, Cloud Run domain mapping). This folder is the source of truth for deploying.

## What gets created

| Piece | Name | Notes |
|---|---|---|
| Website | Cloud Run `eul-web` | Next.js standalone, `eulimousine.com` |
| Dashboard | Cloud Run `eul-dashboard` | nginx, `app.eulimousine.com` |
| API | Cloud Run `eul-api` | NestJS, `api.eulimousine.com` |
| Worker | Cloud Run `eul-worker` | BullMQ (emails), private, always on, exactly 1 instance |
| Migrations / seed | Cloud Run jobs `eul-migrate`, `eul-seed` | run by every deploy / first deploy only |
| Database | Cloud SQL `eul-pg`, PostgreSQL 17 | no authorised networks; reached only via the Cloud SQL connector; daily backups + point-in-time recovery (14 days) |
| Queues | Memorystore `eul-redis`, Redis 7.2 | `noeviction`, AUTH on, private network only |
| Images | Artifact Registry `eul` | `backend` (API + worker + jobs), `web`, `dashboard` |
| HTTPS | Load balancer `eul-lb` + Google-managed certificate | one IP for all four host names |
| Secrets | Secret Manager (EU only) | each service reads only its own |

**Why the database has a public IP with no authorised networks** (the October guide said private IP only):
nobody can connect to that IP directly; Cloud Run reaches the database only through Google's Cloud SQL
connector (a Unix socket, encrypted and IAM-checked with the `cloudsql.client` role). A private-IP TCP
connection would need `sslmode=require`, which the Node `pg` driver now treats as full certificate
verification, and that fails against Cloud SQL's own certificate authority without shipping its CA file.

Cloud Run's own domain mapping is **not** used: Google marks it Preview and not recommended for
production. The load balancer is the supported way and also carries WebSockets for the live dispatch map.

## One-time setup (in this order)

**0. Before you start**
- A Google Cloud project with billing linked (Console → Billing). Put its id in `config.sh` (`PROJECT_ID`).
- Set `GITHUB_REPO` in `config.sh` and push the repo to GitHub.
- In Hostinger → Emails: the mailboxes `bookings@` (sends system emails) and `info@` (receives website enquiries) exist.
- Google Maps **server key** (APIs & Services → Credentials), restricted to *Places API (New)* and *Routes API*.
- Optional now, required for launch: a Cloudflare **Turnstile** site for `eulimousine.com` (site key + secret key).

**1. Foundation** — APIs, network, database, Redis, registry, service accounts (≈15 min, mostly waiting)
```bash
git clone https://github.com/<owner>/<repo>.git && cd <repo>
bash infrastructure/gcp/1-foundation.sh
```

**2. Secrets** — generates the database password and JWT secret; asks (hidden input) for the SMTP
password, Maps server key, Turnstile secret and the first admin's password
```bash
bash infrastructure/gcp/2-secrets.sh
```

**3. GitHub deploys** — Workload Identity Federation (no keys); prints the GitHub variables to add
```bash
bash infrastructure/gcp/3-github.sh
```
Then in GitHub: create environment **production** (required reviewer = you) and add the printed variables.

**4. First deploy** — GitHub → Actions → **Deploy** → *Run workflow* → tick **seed** → Run.
It builds the three images, runs the migrations, creates the first admin
(`admin@eulimousine.com` unless you set `SEED_ADMIN_EMAIL`), and deploys all four services.
Check: open the `eul-api` URL it prints + `/health` → the answer contains `"status":"ok"`.

**5. Domains** — load balancer + certificate, then DNS records in Cloudflare
```bash
bash infrastructure/gcp/4-load-balancer.sh
```
Add the four **A records** it prints in **Cloudflare → DNS**, each **DNS only (grey cloud)**.
Keep every MX / TXT / mail record. Never proxy (orange cloud): the Google certificate would stop renewing.
After 15–60 min the certificate is ACTIVE and `https://eulimousine.com`, `https://app.…` and `https://api.…/health` work.

**6. Monitoring**
```bash
ALERT_EMAIL=you@eulimousine.com bash infrastructure/gcp/5-monitoring.sh
```
Also set a **budget with alerts** in Console → Billing → Budgets & alerts.

**7. Acceptance check 13 — backup restore** (once there is some data)
```bash
bash infrastructure/gcp/6-backup-restore-test.sh <image tag of the current release>
```
Restores production to a temporary instance, reads it with the app, prints counts, deletes the copy.

## Every release after that

Merge to `main` → CI passes → **Deploy** waits for your approval in GitHub → images build →
`eul-migrate` runs `prisma migrate deploy` → API, worker, website, dashboard deploy. A failed
migration stops the release before any service changes. All service settings live in `deploy.sh`.

**Roll back** (code only): Console → Cloud Run → service → Revisions → route 100 % to the previous one,
or re-run the Deploy workflow on an older commit. Migrations are never rolled back automatically;
use expand → migrate → contract for breaking schema changes (CLAUDE.md §5 Database).

## Pre-launch vs launch

`config.sh` starts with `PRELAUNCH_MODE=true` and `PAYMENT_PROVIDER=fake`: the full flow works with the
test payment page and no money moves. For the real launch:
1. Payment provider chosen (D-01) and its adapter built; its secrets added with `2-secrets.sh`-style commands.
2. A real Turnstile secret + `TURNSTILE_SITE_KEY` GitHub variable.
3. `PRELAUNCH_MODE=false`, `PAYMENT_PROVIDER=<provider>` in `config.sh` → merge → deploy.
The API refuses to start in production with the fake provider or the Turnstile test secret unless
`PRELAUNCH_MODE=true`, so this cannot be forgotten silently.

## Email (Hostinger SMTP)

System emails are sent by the worker as `bookings@eulimousine.com` through `smtp.hostinger.com:465`.
Hostinger's SPF/DKIM records (now in Cloudflare DNS) already cover mail sent through Hostinger, so no
change is needed. Recommended before launch: a **DMARC** TXT record `_dmarc` →
`v=DMARC1; p=none; rua=mailto:info@eulimousine.com` (Cloudflare → DNS, DNS only). If you later switch to a
dedicated sender (D-20), merge its include into the **one** SPF record.

## Changing a secret

```bash
printf %s 'NEW VALUE' | gcloud secrets versions add smtp-pass --data-file=-
```
Then re-run the Deploy workflow (services read `:latest` at start).
