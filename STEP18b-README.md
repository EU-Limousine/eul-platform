# Step 18b — Deployment kit for TWO projects (staging + production)

Replaces step 18 (unzip over the repo root; same files plus new ones). No app code changed.
- infrastructure/gcp/config.sh — EUL_ENV=staging (eu-limo-staging) | production (eu-limo)
- infrastructure/gcp/budgets.sh — monthly budget + alerts per project (run FIRST)
- infrastructure/gcp/staging-sleep.sh — pause/wake staging to save money
- .github/workflows/deploy.yml + deploy-env.yml — staging automatically, production after your approval
- apps/api/Dockerfile, apps/website/Dockerfile — as in step 18

Edit GITHUB_REPO in infrastructure/gcp/config.sh, then follow infrastructure/gcp/README.md.
