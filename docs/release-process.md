# Release process — dev → staging, main → production

```
feature/xyz ──PR──▶ dev ──(auto)──▶ STAGING ──e2e tests──▶ ✓ staging/verified
                                                               │
                              dev ──PR──▶ main ──(auto)──▶ PRODUCTION ──smoke──▶ ✓  (✗ → automatic rollback)
hotfix/xyz (from main) ──"Deploy staging" by hand──▶ ✓ ──PR──▶ main ──▶ PRODUCTION ──▶ PR main → dev (auto)
```

## The rules GitHub enforces

| Branch | How code gets in | Must be green before merging |
|---|---|---|
| `dev` | Pull request only (no direct push, no force-push, cannot be deleted) | **check** (type check, unit tests, Prisma schema, build) |
| `main` | Pull request **from `dev` or `hotfix/*` only**, also for admins | **check**, **promotion-guard**, **staging/verified** |

- **staging/verified** is set by *Deploy staging* on the exact commit it deployed, after the
  end-to-end tests passed on staging. A PR `dev → main` shows it on its head commit, so GitHub only
  lets you merge code that was really tested on staging.
- *Deploy production* checks it again (the merge commit's second parent must be verified), so even
  a manual run cannot ship untested code. Production only ever deploys `main`.
- Merge `dev → main` with **Create a merge commit**, never squash: squash gives main different commits
  than dev and every later release would conflict. Feature PRs into `dev` may be squashed.

## Workflows

| Workflow | Starts | What it does |
|---|---|---|
| **CI** | every PR into `dev` or `main`; reused by both deploys | `npm ci`, Prisma validate, `turbo run typecheck test build` |
| **Promotion guard** | every PR into `main` | fails unless the source branch is `dev` or `hotfix/*` |
| **Deploy staging** | push to `dev` (= merged PR); by hand for `hotfix/*` | staging/verified → pending · CI · build + migrate + deploy staging · smoke · Playwright e2e on staging · staging/verified → success/failure |
| **Deploy production** | push to `main` (= merged PR) | verified-on-staging check · CI · build + migrate + deploy production · read-only smoke · **automatic rollback if smoke fails** · PR `main → dev` if dev is behind |
| **Rollback** | by hand (Actions → Rollback) | previous release gets 100 % traffic, then smoke |

Releases never run in parallel per environment and are never cancelled halfway (a migration must
not be interrupted). A newer release waits for the running one.

## Scenarios

### 1. Normal feature
1. `git switch dev && git pull && git switch -c feature/booking-notes`
2. Work, commit, push, open **PR → dev**. CI runs on the PR. Merge when green (squash is fine).
3. *Deploy staging* runs by itself: staging is updated and the end-to-end tests run there.
4. Look at staging yourself if you like (`staging.eulimousine.com`, `app-staging.eulimousine.com`).

### 2. Release to production
1. Open **PR dev → main** (title e.g. "Release 2026-11-25"). Checks: CI, promotion-guard, staging/verified.
2. Merge with **Create a merge commit** → *Deploy production* runs.
3. When it ends green, production is live with exactly the code that passed on staging.

### 3. CI fails on a PR
The PR cannot be merged. Fix on the same branch and push; CI runs again.

### 4. End-to-end tests fail on staging
- staging/verified becomes ✗ → the PR `dev → main` cannot be merged. Production is untouched.
- Open the run → artifact **playwright-report-staging-…** (screenshots, video, trace of each failure).
- Fix with a new PR into `dev`. The next staging run sets a new staging/verified on the new commit.
- Flaky test? Re-run the failed jobs of *Deploy staging* (Actions → the run → *Re-run failed jobs*).

### 5. Migration fails (staging or production)
The `eul-migrate` job fails → the deploy stops **before any service changes**; the old release keeps
running. Read the job log (Cloud Run → Jobs → eul-migrate → Logs), fix the migration in a new PR.
Never edit a migration that already ran on staging or production — add a new one.

### 6. Production smoke test fails right after a release
*Deploy production* automatically moves traffic back to the previous release and fails red.
Database changes stay (see *Migrations* below). Fix in `dev`, release again as in scenario 2.

### 7. Bug found in production later (not urgent)
Fix in `dev` (scenario 1), release (scenario 2).

### 8. Urgent hotfix (production is broken, dev contains unreleased work)
1. `git switch main && git pull && git switch -c hotfix/payment-timeout`
2. Fix, push, open **PR hotfix/payment-timeout → main** (promotion-guard allows `hotfix/*`).
3. Actions → **Deploy staging** → *Run workflow* → branch **hotfix/payment-timeout** (e2e ticked).
   Staging now runs the hotfix; when green, the PR shows staging/verified ✓.
4. Merge (merge commit) → *Deploy production* → live.
5. *Deploy production* opens **PR main → dev** automatically. Merge it (merge commit) so the fix is in
   the next release. If its CI did not start, close and reopen the PR. The next push to `dev`
   puts dev's code back on staging.

### 9. Something is wrong and you need the previous version NOW
Actions → **Rollback** → environment **production** → Run. Traffic goes to the previous release in
about a minute; the smoke test confirms. Then fix forward (scenario 7 or 8). The next normal release
moves traffic to the new version again automatically.

### 10. Change only infrastructure settings (memory, instances, env values in `deploy.sh`/`config.sh`)
Same path as code: PR → dev (staging gets it) → dev → main (production gets it).

### 11. Change a secret (password, key)
Not through Git. Cloud Shell: `printf %s 'NEW' | gcloud secrets versions add <name> --data-file=-`
(project `eu-limo-staging` or `eu-limo`), then re-run the last deploy of that environment
(Actions → the last *Deploy* run → *Re-run all jobs*).

### 12. Staging is asleep (`staging-sleep.sh`)
A push to `dev` wakes it: the deploy starts the database and the worker before migrating.

### 13. Two merges into dev close together
The second *Deploy staging* waits for the first, then deploys and tests the newer commit. Each commit
gets its own staging/verified; a PR `dev → main` uses the newest one.

### 14. Someone opens a PR from a feature branch into main
promotion-guard fails: "Only 'dev' or 'hotfix/*' may be merged into main". Change the PR's base to `dev`.

## Migrations: why rollback never touches the database

Rollback switches the **code** back; the database keeps the newest schema. That is safe only if every
migration is **backwards-compatible** (CLAUDE.md §5 Database: expand → migrate → contract):
- Adding a table, a nullable column or an index: fine in one release.
- Renaming or removing a column: release 1 adds the new column and writes both; release 2 moves the
  reads; release 3 removes the old column. The previous release must always still work.
- If a migration itself is wrong in production: write a new corrective migration and release it
  (scenario 8). Restore from backup only as the last resort (point-in-time recovery, see
  `infrastructure/gcp/6-backup-restore-test.sh` for the clone command).

## One-time setup

1. GCP side for both projects: `infrastructure/gcp/README.md`.
2. GitHub side (your PC, GitHub CLI): `.\scripts\github-setup.ps1 -Repo "<owner>/<repo>"` —
   creates `dev`, makes it the default branch, sets the protections above, the environments and
   the staging test login (`E2E_ADMIN_EMAIL` variable + `E2E_ADMIN_PASSWORD` secret).
3. Add `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER`, `GCP_DEPLOYER`, `TURNSTILE_SITE_KEY` to each environment
   (printed by `EUL_ENV=<env> bash infrastructure/gcp/3-github.sh`).
4. Delete the old `.github/workflows/deploy.yml` if it exists.
5. Optional: GitHub → Settings → Environments → production → *Required reviewers* for one extra
   click before each production release.
