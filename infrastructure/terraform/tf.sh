#!/usr/bin/env bash
# Run Terraform for one environment (in Google Cloud Shell, which has Terraform installed):
#   EUL_ENV=staging    bash infrastructure/terraform/tf.sh bootstrap   # once per project: state bucket + base APIs
#   EUL_ENV=staging    bash infrastructure/terraform/tf.sh plan        # shows what would change; changes nothing
#   EUL_ENV=staging    bash infrastructure/terraform/tf.sh apply       # makes the changes (asks "yes" first)
#   EUL_ENV=staging    bash infrastructure/terraform/tf.sh output      # GitHub variables, DNS records, …
# Default EUL_ENV is staging, so production is never touched by accident.
set -euo pipefail
cd "$(dirname "$0")"

ENV="${EUL_ENV:-staging}"
case "$ENV" in staging|production) ;; *) echo "EUL_ENV must be staging or production"; exit 1 ;; esac
VARS="envs/${ENV}.tfvars"
PROJECT_ID=$(sed -nE 's/^project_id *= *"([^"]+)".*/\1/p' "$VARS")
BUCKET="${PROJECT_ID}-tfstate"
CMD="${1:-plan}"; shift || true

printf '\n\033[1;33m▶ Terraform %s — %s (%s)\033[0m\n' "$CMD" "$ENV" "$PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null 2>&1

if [ "$CMD" = "bootstrap" ]; then
  # Things Terraform needs before it can run: two base APIs and a bucket for its state.
  gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com storage.googleapis.com --project="$PROJECT_ID"
  if ! gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1; then
    gcloud storage buckets create "gs://${BUCKET}" --project="$PROJECT_ID" --location=europe-west1 \
      --uniform-bucket-level-access --public-access-prevention
  fi
  # Versioning: every state change is kept, so a mistake can be undone.
  gcloud storage buckets update "gs://${BUCKET}" --versioning >/dev/null
  echo "  ✓ state bucket gs://${BUCKET} (private, versioned)"
  exit 0
fi

grep -q 'YOUR-ORG/eul-platform' envs/common.tfvars && { echo "Edit github_repo in infrastructure/terraform/envs/common.tfvars first."; exit 1; }

terraform init -input=false -reconfigure \
  -backend-config="bucket=${BUCKET}" -backend-config="prefix=eul" >/dev/null
echo "  ✓ state: gs://${BUCKET}/eul"

case "$CMD" in
  plan|apply|destroy|import|refresh)
    terraform "$CMD" -var-file=envs/common.tfvars -var-file="$VARS" "$@" ;;
  output)
    terraform output "$@" ;;
  *)
    terraform "$CMD" "$@" ;;
esac
