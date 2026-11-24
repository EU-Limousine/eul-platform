# Step 19 — Release flow: dev → staging, main → production

Apply AFTER step 18b (unzip over the repo root). Then DELETE the old workflow:
    Remove-Item .github/workflows/deploy.yml
No app code or package.json changed.

New / changed:
- .github/workflows/ci.yml                 PRs into dev/main + reused by both deploys
- .github/workflows/promotion-guard.yml    only dev or hotfix/* may be merged into main
- .github/workflows/deploy-staging.yml     push to dev → CI → staging → e2e on staging → staging/verified
- .github/workflows/deploy-production.yml  push to main → verified check → CI → production → smoke → auto-rollback
- .github/workflows/rollback.yml           emergency button
- infrastructure/gcp/smoke.sh, rollback.sh (new), deploy.sh (traffic back to latest), README.md
- e2e/support/*                            E2E_TARGET=staging mode; refuses to run against production
- scripts/github-setup.ps1                 dev branch, branch protection, environments, e2e login
- docs/release-process.md                  every scenario: feature, release, hotfix, failures, rollback
