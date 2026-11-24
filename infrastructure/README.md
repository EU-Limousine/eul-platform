# Infrastructure — Google Cloud with Terraform

Two Google Cloud projects in `europe-west1` (CLAUDE.md D-14), identical except for size:

| | Staging | Production |
|---|---|---|
| Project id | `eu-limo-staging` | `eu-limo` |
| Website | `staging.eulimousine.com` | `eulimousine.com` (+ `www` → 301) |
| Dashboard | `app-staging.eulimousine.com` | `app.eulimousine.com` |
| API | `api-staging.eulimousine.com` | `api.eulimousine.com` |
| Database | `db-g1-small` (shared core), 7 backups | `db-custom-1-3840` (1 vCPU, 3.75 GB), 14 backups + point-in-time recovery |
| API / website when idle | scale to zero | 1 warm instance each |
| Search engines | `X-Robots-Tag: noindex` | indexed |
| Load balancer + domains | on | **off until launch** (pre-launch, see below) |
| Uptime / worker alerts | off (staging sleeps at night) | on |
| Deploys | automatically from `develop` | from `main` after staging verified (docs/release-process.md) |

The domain is registered at **Hostinger**, DNS is at **Cloudflare** with every record *DNS only*
(grey cloud), staff email stays on **Hostinger Email** (D-19).

## Who does what

| Terraform — `infrastructure/terraform` (rarely changes, reviewed with `plan`) | Releases — GitHub Actions + `infrastructure/gcp/deploy.sh` (every release) |
|---|---|
| APIs, network, Cloud SQL, Redis, image registry (keeps 10 newest images) | Build the three images |
| Service accounts + permissions, GitHub keyless login (Workload Identity Federation) | `eul-migrate` job (`prisma migrate deploy`), first-time `eul-seed` |
| Secret **containers** + who may read them | Cloud Run services: API, worker, website, dashboard |
| Load balancer, certificate, `noindex` on staging | Smoke test, automatic rollback |
| Budgets, uptime checks, alert emails, cost labels | |

**Secret values are never in Terraform.** `infrastructure/gcp/secrets.sh` adds them (generated in
Cloud Shell or typed hidden), so passwords never land in the Terraform state. One exception Google
does not let us avoid: the Redis AUTH string is readable from the Redis resource, so it is in the
state. The state bucket is therefore private (project owners only) and versioned.

Everything runs in **Google Cloud Shell** (console.cloud.google.com → `>_`): it has `gcloud` and is
logged in as you. Never paste a secret into chat, the repo or GitHub.

**Terraform in Cloud Shell** (once; the second block keeps it installed after Cloud Shell restarts):
```bash
wget -O - https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor --yes -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release || lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y terraform

cat > ~/.customize_environment <<'EOF'
#!/bin/sh
wget -O - https://apt.releases.hashicorp.com/gpg | gpg --dearmor --yes -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release || lsb_release -cs) main" > /etc/apt/sources.list.d/hashicorp.list
apt-get update && apt-get install -y terraform
EOF
```

**Budgets need billing-account permission.** Owning the project is not enough: creating a budget needs
*Billing Account Costs Manager* on the billing account. Without it, `tf.sh` skips the budget (and says so)
and creates everything else; run `apply` again once the permission is granted.

## Files

```
infrastructure/
  terraform/
    tf.sh                     wrapper: EUL_ENV=staging|production bash tf.sh bootstrap|plan|apply|output
    versions.tf  variables.tf  main.tf  iam.tf  load_balancer.tf  monitoring.tf  outputs.tf
    envs/common.tfvars        github_repo (EU-Limousine/eul-platform), budget currency (DKK)
    envs/staging.tfvars       sizes and switches for eu-limo-staging
    envs/production.tfvars    sizes and switches for eu-limo (alerts → info@eulimousine.com)
  gcp/
    config.sh                 names and hosts for the release scripts (must match the tfvars)
    secrets.sh                secret values
    deploy.sh                 one release (called by GitHub Actions)
    smoke.sh  rollback.sh     after-deploy check / back to the previous release
    staging-sleep.sh          pause / wake staging
    backup-restore-test.sh    acceptance check 13
```

## One-time setup

**Before you start**
- Both projects exist with billing linked ✔.
- Already set: `github_repo = "EU-Limousine/eul-platform"`, `budget_currency = "DKK"`,
  production alerts to `info@eulimousine.com` (change `alert_email` in `envs/production.tfvars` if
  another mailbox should get them).
- **Billing currency:** a budget must be in the billing account's own currency, and that currency is
  fixed when the billing account is created. Check Console → Billing → Account management. `tf.sh plan`
  also checks it and stops with a clear message if it is not DKK (then set `budget_currency` and the
  two `budget_amount` values to that currency).
- Hostinger → Emails: the mailboxes `bookings@` (sends system emails) and `info@` (receives enquiries) exist.
- In **each** project: a Google Maps **server key** (APIs & Services → Credentials), restricted to
  *Places API (New)* and *Routes API* (one key per project, so Maps costs show per environment).
- Staging uses Cloudflare's Turnstile **test keys** (leave empty), so automated tests are never
  stopped by a bot check. Production needs a real widget for `eulimousine.com` before launch.

**A. GitHub** (your PC, GitHub CLI) — `develop` branch, protection, environments, test login
```powershell
gh auth login
git push -u origin feat/deployment-build
.\scripts\github-setup.ps1
```
Pick the staging admin email + password it asks for and remember them (used again in B).
Open the PR `feat/deployment-build → develop`, but do not merge yet.

**B. Staging infrastructure** (Cloud Shell)
```bash
git clone -b feat/deployment-build https://github.com/EU-Limousine/eul-platform.git && cd eul-platform
EUL_ENV=staging bash infrastructure/terraform/tf.sh bootstrap   # state bucket (once)
EUL_ENV=staging bash infrastructure/terraform/tf.sh plan        # read it: about 84–85 to add, 0 to change, 0 to destroy
EUL_ENV=staging bash infrastructure/terraform/tf.sh apply       # type "yes"; ~15 min; billing starts here
EUL_ENV=staging bash infrastructure/gcp/secrets.sh              # SMTP password, Maps key, Turnstile empty, admin password = the one from A
EUL_ENV=staging bash infrastructure/terraform/tf.sh output      # GitHub variables + DNS records
```
Copy `github_environment_variables` to GitHub → Settings → Environments → **staging** → variables.
Add the `dns_records` in **Cloudflare → DNS**, each **DNS only (grey cloud)**.

**C. First staging deploy** (GitHub)
1. Merge the PR into `develop` (squash). *Deploy staging* starts; its end-to-end tests may fail if the
   certificate is not ACTIVE yet (check with the `certificate_check` output). That red run is expected.
2. Actions → **Deploy staging** → *Run workflow* on `develop`, tick **seed** (creates the first admin).
   Once the certificate is ACTIVE (15–60 min after DNS), leave **end-to-end tests** ticked:
   it must end with a green **staging/verified**.

**D. Production infrastructure** (Cloud Shell, once staging looks right)
```bash
EUL_ENV=production bash infrastructure/terraform/tf.sh bootstrap
EUL_ENV=production bash infrastructure/terraform/tf.sh plan
EUL_ENV=production bash infrastructure/terraform/tf.sh apply
EUL_ENV=production bash infrastructure/gcp/secrets.sh
EUL_ENV=production bash infrastructure/terraform/tf.sh output   # variables → GitHub environment "production"
```
Then PR **develop → main**, merge with **Create a merge commit** → *Deploy production* runs. After this
first release, run Actions → **Deploy production** on `main` once with **seed** ticked.
Production answers only on its `run.app` addresses until launch (no load balancer, no DNS).

**E. Acceptance check 13 — backup restore** (production, once there is some data)
```bash
EUL_ENV=production bash infrastructure/gcp/backup-restore-test.sh <image tag of the current release>
```

## Changing infrastructure later

Edit the `.tf` / `.tfvars` files → PR into `develop` (CI runs `terraform validate`) → in Cloud Shell:
```bash
EUL_ENV=staging bash infrastructure/terraform/tf.sh plan    # read what will change
EUL_ENV=staging bash infrastructure/terraform/tf.sh apply
```
After the release to `main`, the same with `EUL_ENV=production`. **Read every plan**: a line with
`must be replaced` or `destroy` on the database or Redis needs a second look (the database also has
deletion protection, so Terraform and Google both refuse to delete it).

Never change these resources by hand in the console: the next `plan` shows it as a change and
`apply` would undo it. The only exceptions Terraform ignores on purpose: the database being stopped
by `staging-sleep.sh`, and everything Cloud Run (owned by `deploy.sh`).

## Pre-launch vs launch

`config.sh` starts with `PRELAUNCH_MODE=true` and `PAYMENT_PROVIDER=fake`: the full flow works with the
test payment page and no money moves. Staging always stays like this. For the real production launch:
1. Payment provider chosen (D-01) and its adapter built; its secret values added in production.
2. A real Turnstile secret (`gcloud secrets versions add turnstile-secret …`) + `TURNSTILE_SITE_KEY`
   variable in the GitHub **production** environment.
3. `config.sh`, production: `PRELAUNCH_MODE=false`, `PAYMENT_PROVIDER=<provider>` → PR → release.
4. `envs/production.tfvars`: `enable_load_balancer = true` → `tf.sh plan` / `apply` → add the
   `dns_records` output in Cloudflare (DNS only) → re-run *Deploy production* (closes the run.app URLs).
The API refuses to start in production with the fake provider or the Turnstile test secret unless
`PRELAUNCH_MODE=true`, so this cannot be forgotten silently.

## Costs (estimate, November 2026, Google's list prices in USD, DKK at ≈ 6.5 per USD)

Google's list prices (Tier-1 region rates; `europe-west1` can be a few percent higher), before taxes
and the small Cloud Run free tier (shared by both projects). **Not included:** Google Maps API calls
(per request — set quotas in APIs & Services), payment-provider fees, Hostinger email.

| Part | Production | Staging, always on | Staging with nightly/weekend sleep |
|---|---|---|---|
| Database (Cloud SQL) | ≈ 52 | ≈ 28 | ≈ 10 |
| Redis (Memorystore Basic 1 GB) | ≈ 36 | ≈ 36 | ≈ 36 |
| Worker (always on, 1 vCPU) | ≈ 50 | ≈ 50 | ≈ 15 |
| API + website | ≈ 25 | ≈ 2 | ≈ 2 |
| Dashboard | ≈ 1 | ≈ 1 | ≈ 1 |
| Load balancer (+ traffic) | ≈ 20 (0 until launch) | ≈ 20 | ≈ 20 |
| Images, secrets, logs, monitoring, state bucket | ≈ 5 | ≈ 3 | ≈ 3 |
| **Total per month** | **≈ 190 USD** (≈ 170 before launch) | **≈ 140 USD** | **≈ 85 USD** |
| **in DKK** | **≈ 1,240 DKK** (≈ 1,100 before launch) | **≈ 910 DKK** | **≈ 550 DKK** |

Both projects together: **≈ 1,800–2,150 DKK a month** (≈ 275–330 USD). Google bills in your billing
account's currency at its own exchange rate, so the DKK figures move with USD/DKK.

Budgets (in Terraform, alerts at 50 / 90 / 100 % and forecast): **1,600 DKK production, 1,000 DKK staging**.
Every resource is labelled `app`, `env`, `component`: Billing → Reports → group by label.

Spend less: `bash infrastructure/gcp/staging-sleep.sh` when nobody tests (wake with `… wake`,
a deploy also wakes it); committed-use discounts only after a few months of real bills.

## Email (Hostinger SMTP)

The worker sends as `bookings@eulimousine.com` through `smtp.hostinger.com:465` (both environments;
staging sends real emails, so test with your own addresses). Hostinger's SPF/DKIM (now in Cloudflare
DNS) already cover it. Before launch add a **DMARC** TXT record `_dmarc` →
`v=DMARC1; p=none; rua=mailto:info@eulimousine.com` (Cloudflare, DNS only).

## Changing a secret

```bash
gcloud config set project eu-limo-staging      # or eu-limo
printf %s 'NEW VALUE' | gcloud secrets versions add smtp-pass --data-file=-
```
Then re-run the last deploy of that environment (services read `:latest` at start).
