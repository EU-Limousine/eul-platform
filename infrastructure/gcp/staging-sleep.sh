#!/usr/bin/env bash
# Put STAGING to sleep when nobody is testing (nights, weekends, holidays) to save money:
#   bash infrastructure/gcp/staging-sleep.sh      sleep
#   bash infrastructure/gcp/staging-sleep.sh wake wake up again (a deploy also wakes it)
# Sleeping stops the database (you then pay only its disk) and the always-on worker.
# Redis and the load balancer cannot be paused; they keep costing the same.
# Only for staging: the script refuses to touch production.
set -euo pipefail
export EUL_ENV=staging
source "$(dirname "$0")/config.sh"
[ "$PROJECT_ID" = "eu-limo-staging" ] || { echo "Refusing: not the staging project."; exit 1; }

if [ "${1:-sleep}" = "wake" ]; then
  log "Waking staging"
  gcloud sql instances patch "$SQL_INSTANCE" --activation-policy=ALWAYS --quiet
  gcloud run services update eul-worker --region="$REGION" --min-instances=1 --quiet >/dev/null
  ok "database running, worker running (about 2–5 minutes until everything answers)"
else
  log "Putting staging to sleep"
  gcloud run services update eul-worker --region="$REGION" --min-instances=0 --quiet >/dev/null
  gcloud sql instances patch "$SQL_INSTANCE" --activation-policy=NEVER --quiet
  ok "worker stopped, database stopped. Wake with: bash infrastructure/gcp/staging-sleep.sh wake"
fi
