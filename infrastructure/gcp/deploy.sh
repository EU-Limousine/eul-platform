#!/usr/bin/env bash
# Release: migrate the database, then deploy API, worker, website and dashboard.
# Every setting lives here, so each run is a full, repeatable deploy (no hidden console changes).
# Called by GitHub Actions after the images are pushed:
#   bash infrastructure/gcp/deploy.sh <image-tag> [--seed]
# --seed also runs the seed job once: first admin + unconfirmed demo vehicle classes (D-09).
set -euo pipefail
source "$(dirname "$0")/config.sh"

TAG="${1:?usage: deploy.sh <image-tag> [--seed]}"
SEED="${2:-}"
BACKEND="${IMAGE_BASE}/backend:${TAG}"
WEB="${IMAGE_BASE}/web:${TAG}"
DASHBOARD="${IMAGE_BASE}/dashboard:${TAG}"

# Before the load balancer exists the run.app URLs stay public (health checks only).
# Once it exists, only the load balancer may reach the public services.
if gcloud compute url-maps describe "$LB_NAME" --global >/dev/null 2>&1; then
  INGRESS="internal-and-cloud-load-balancing"
else
  INGRESS="all"
fi
ok "ingress for public services: $INGRESS"

VPC_FLAGS=(--network="$VPC" --subnet="$SUBNET" --vpc-egress=private-ranges-only)
SQL_FLAGS=(--set-cloudsql-instances="$SQL_CONNECTION")

log "1/5 Database migrations (prisma migrate deploy)"
gcloud run jobs deploy eul-migrate \
  --image="$BACKEND" --region="$REGION" \
  --service-account="$(sa sa-migrate)" "${SQL_FLAGS[@]}" \
  --set-secrets=DATABASE_URL=database-url:latest \
  --command=npm --args=run,migrate:deploy,-w,@eul/db \
  --max-retries=0 --task-timeout=10m --quiet
gcloud run jobs execute eul-migrate --region="$REGION" --wait

if [ "$SEED" = "--seed" ]; then
  log "Seed (first admin, dispatch settings, demo vehicle classes marked unconfirmed)"
  gcloud run jobs deploy eul-seed \
    --image="$BACKEND" --region="$REGION" \
    --service-account="$(sa sa-migrate)" "${SQL_FLAGS[@]}" \
    --set-env-vars="SEED_ADMIN_EMAIL=${SEED_ADMIN_EMAIL:-admin@${DOMAIN}}" \
    --set-secrets=DATABASE_URL=database-url:latest,SEED_ADMIN_PASSWORD=seed-admin-password:latest \
    --command=npm --args=run,seed,-w,@eul/db \
    --max-retries=0 --task-timeout=10m --quiet
  gcloud run jobs execute eul-seed --region="$REGION" --wait
fi

log "2/5 API (eul-api)"
gcloud run deploy eul-api \
  --image="$BACKEND" --region="$REGION" \
  --service-account="$(sa sa-api)" "${SQL_FLAGS[@]}" "${VPC_FLAGS[@]}" \
  --cpu=1 --memory=1Gi --min-instances="${API_MIN_INSTANCES:-1}" --max-instances=5 \
  --concurrency=80 --timeout=3600 --session-affinity --cpu-boost \
  --ingress="$INGRESS" --allow-unauthenticated \
  --set-env-vars="^|^NODE_ENV=production|TZ=UTC|DB_POOL_MAX=5\
|CORS_ORIGINS=https://${WEB_HOST},https://www.${DOMAIN},https://${APP_HOST}\
|API_PUBLIC_URL=https://${API_HOST}|WEBSITE_URL=https://${WEB_HOST}\
|PAYMENT_PROVIDER=${PAYMENT_PROVIDER}|PRELAUNCH_MODE=${PRELAUNCH_MODE}\
|DEFAULT_CURRENCY=${DEFAULT_CURRENCY}|ENQUIRY_EMAIL=${ENQUIRY_EMAIL}" \
  --set-secrets=DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,JWT_ACCESS_SECRET=jwt-access-secret:latest,TURNSTILE_SECRET=turnstile-secret:latest,GOOGLE_MAPS_SERVER_KEY=google-maps-server-key:latest,FAKE_PAYMENT_SECRET=fake-payment-secret:latest \
  --quiet

log "3/5 Worker (eul-worker): always on, private"
# CPU always allocated and exactly one instance: BullMQ must keep running delayed jobs between requests.
gcloud run deploy eul-worker \
  --image="$BACKEND" --region="$REGION" \
  --command=node --args=apps/worker/dist/main.js \
  --service-account="$(sa sa-worker)" "${SQL_FLAGS[@]}" "${VPC_FLAGS[@]}" \
  --cpu=1 --memory=512Mi --min-instances=1 --max-instances=1 --no-cpu-throttling \
  --ingress=internal --no-allow-unauthenticated \
  --set-env-vars="^|^NODE_ENV=production|TZ=UTC|DB_POOL_MAX=3|SMTP_HOST=${SMTP_HOST}|SMTP_PORT=${SMTP_PORT}|SMTP_USER=${SMTP_USER}|MAIL_FROM=${MAIL_FROM}" \
  --set-secrets=DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,SMTP_PASS=smtp-pass:latest \
  --quiet

log "4/5 Website (eul-web)"
gcloud run deploy eul-web \
  --image="$WEB" --region="$REGION" \
  --service-account="$(sa sa-web)" \
  --cpu=1 --memory=512Mi --min-instances="${WEB_MIN_INSTANCES:-1}" --max-instances=5 \
  --concurrency=80 --cpu-boost \
  --ingress="$INGRESS" --allow-unauthenticated \
  --set-env-vars="SITE_URL=https://${WEB_HOST}" \
  --quiet

log "5/5 Dashboard (eul-dashboard, nginx)"
gcloud run deploy eul-dashboard \
  --image="$DASHBOARD" --region="$REGION" \
  --service-account="$(sa sa-web)" \
  --cpu=1 --memory=256Mi --min-instances=0 --max-instances=3 \
  --ingress="$INGRESS" --allow-unauthenticated \
  --set-env-vars="API_URL=https://${API_HOST}" \
  --quiet

log "Released ${TAG}"
for S in eul-api eul-web eul-dashboard; do
  printf '  %-14s %s\n' "$S" "$(gcloud run services describe "$S" --region="$REGION" --format='value(status.url)')"
done
