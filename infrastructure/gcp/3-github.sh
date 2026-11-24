#!/usr/bin/env bash
# Step 3 — Let GitHub Actions deploy without any stored key (Workload Identity Federation).
# Only the repository in GITHUB_REPO (config.sh) can use it. Run once per project:
#   EUL_ENV=staging    bash infrastructure/gcp/3-github.sh
#   EUL_ENV=production bash infrastructure/gcp/3-github.sh
set -euo pipefail
source "$(dirname "$0")/config.sh"

[ "$GITHUB_REPO" != "YOUR-ORG/eul-platform" ] || { echo "Set GITHUB_REPO in config.sh first (owner/repo)."; exit 1; }
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

log "Workload identity pool + GitHub provider"
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe github-provider --location=global --workload-identity-pool=github >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools providers create-oidc github-provider \
    --location=global --workload-identity-pool=github \
    --issuer-uri=https://token.actions.githubusercontent.com \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'"

gcloud iam service-accounts add-iam-policy-binding "$(sa sa-deployer)" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${GITHUB_REPO}" \
  --quiet >/dev/null
ok "only ${GITHUB_REPO} may deploy as sa-deployer"

cat <<EOF

────────────────────────────────────────────────────────────────────────
In GitHub → ${GITHUB_REPO} → Settings → Environments → New environment "${EUL_ENV}"
$( [ "$EUL_ENV" = "production" ] && echo '(tick "Required reviewers" and add yourself: production deploys wait for your click)' || echo '(no reviewers: staging deploys automatically after CI)')
Then add these environment VARIABLES (not secrets — none of them is secret):

  GCP_PROJECT_ID     ${PROJECT_ID}
  GCP_WIF_PROVIDER   projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/github-provider
  GCP_DEPLOYER       $(sa sa-deployer)
  TURNSTILE_SITE_KEY <Cloudflare Turnstile site key, or leave empty during pre-launch>
────────────────────────────────────────────────────────────────────────
EOF
