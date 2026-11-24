#!/usr/bin/env bash
# Step 1 — APIs, network, database, Redis, image registry and service accounts.
# Safe to run again: everything that already exists is skipped.
# Run in Google Cloud Shell from the repo root:  bash infrastructure/gcp/1-foundation.sh
set -euo pipefail
source "$(dirname "$0")/config.sh"

log "Enabling Google Cloud APIs (takes a minute)"
gcloud services enable \
  run.googleapis.com sqladmin.googleapis.com redis.googleapis.com compute.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com iam.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com monitoring.googleapis.com \
  logging.googleapis.com cloudtrace.googleapis.com
ok "APIs enabled"

log "Network: VPC + subnet for Cloud Run (Direct VPC egress, used to reach Redis)"
gcloud compute networks describe "$VPC" >/dev/null 2>&1 \
  || gcloud compute networks create "$VPC" --subnet-mode=custom
gcloud compute networks subnets describe "$SUBNET" --region="$REGION" >/dev/null 2>&1 \
  || gcloud compute networks subnets create "$SUBNET" --network="$VPC" --region="$REGION" --range=10.10.0.0/24
ok "$VPC / $SUBNET"

log "Cloud SQL (PostgreSQL 17). Creating takes 5–10 minutes."
# Public IP WITHOUT authorised networks: nobody can connect directly. Cloud Run reaches it
# through the built-in Cloud SQL connector (encrypted, IAM-checked) via a Unix socket.
if ! gcloud sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_17 \
    --edition=ENTERPRISE \
    --tier="${SQL_TIER:-db-custom-1-3840}" \
    --region="$REGION" \
    --ssl-mode=ENCRYPTED_ONLY \
    --storage-type=SSD --storage-size=20 --storage-auto-increase \
    --backup-start-time=01:00 \
    --enable-point-in-time-recovery \
    --retained-backups-count=14 \
    --maintenance-window-day=SUN --maintenance-window-hour=3 \
    --deletion-protection
fi
gcloud sql databases describe "$SQL_DB" --instance="$SQL_INSTANCE" >/dev/null 2>&1 \
  || gcloud sql databases create "$SQL_DB" --instance="$SQL_INSTANCE"
ok "Cloud SQL $SQL_INSTANCE / database $SQL_DB (the app user is created in 2-secrets.sh)"

log "Memorystore Redis 7.2 (BullMQ). Creating takes ~5 minutes."
# noeviction: queued jobs and timers must never be silently dropped (CLAUDE.md §2).
gcloud redis instances describe "$REDIS_INSTANCE" --region="$REGION" >/dev/null 2>&1 \
  || gcloud redis instances create "$REDIS_INSTANCE" \
    --region="$REGION" --tier=basic --size=1 --redis-version=redis_7_2 \
    --network="projects/${PROJECT_ID}/global/networks/${VPC}" \
    --redis-config=maxmemory-policy=noeviction \
    --enable-auth
ok "Redis $REDIS_INSTANCE"

log "Artifact Registry (Docker images)"
gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1 \
  || gcloud artifacts repositories create "$AR_REPO" --repository-format=docker --location="$REGION" \
    --description="EU Limousine images"
ok "$IMAGE_BASE"

log "Service accounts (one per service, least privilege)"
for SA in sa-web sa-api sa-worker sa-migrate sa-deployer; do
  gcloud iam service-accounts describe "$(sa $SA)" >/dev/null 2>&1 \
    || gcloud iam service-accounts create "$SA" --display-name="$SA"
done

bind() { gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$(sa "$1")" --role="$2" --condition=None --quiet >/dev/null; }

for SA in sa-web sa-api sa-worker sa-migrate; do
  for ROLE in roles/logging.logWriter roles/monitoring.metricWriter roles/cloudtrace.agent; do bind "$SA" "$ROLE"; done
done
for SA in sa-api sa-worker sa-migrate; do bind "$SA" roles/cloudsql.client; done

# Deployer (GitHub Actions): push images, deploy Cloud Run, run the migration job as the runtime accounts.
for ROLE in roles/run.admin roles/artifactregistry.writer roles/compute.viewer; do bind sa-deployer "$ROLE"; done
for SA in sa-web sa-api sa-worker sa-migrate; do
  gcloud iam service-accounts add-iam-policy-binding "$(sa $SA)" \
    --member="serviceAccount:$(sa sa-deployer)" --role=roles/iam.serviceAccountUser --quiet >/dev/null
done
ok "sa-web, sa-api, sa-worker, sa-migrate, sa-deployer"

log "Done. Next: bash infrastructure/gcp/2-secrets.sh"
