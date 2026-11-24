#!/usr/bin/env bash
# Acceptance check 13: "Backups restore successfully on a test server".
# Restores production to a throw-away instance (point-in-time, 10 minutes ago), checks that the app
# can read it, then deletes everything it created. Production is only read, never changed.
#   bash infrastructure/gcp/backup-restore-test.sh <image-tag>
# Takes 15–30 minutes and costs a few cents (the test instance lives for under an hour).
set -euo pipefail
source "$(dirname "$0")/config.sh"

TAG="${1:?usage: backup-restore-test.sh <image-tag of a deployed release>}"
TEST_INSTANCE="eul-pg-restore-$(date +%Y%m%d%H%M)"
TEST_CONNECTION="${PROJECT_ID}:${REGION}:${TEST_INSTANCE}"
POINT_IN_TIME=$(date -u -d '-10 minutes' +%Y-%m-%dT%H:%M:%SZ)

cleanup() {
  log "Cleaning up"
  gcloud run jobs delete eul-restore-check --region="$REGION" --quiet >/dev/null 2>&1 || true
  gcloud secrets delete restore-test-database-url --quiet >/dev/null 2>&1 || true
  if gcloud sql instances describe "$TEST_INSTANCE" >/dev/null 2>&1; then
    gcloud sql instances patch "$TEST_INSTANCE" --no-deletion-protection --quiet >/dev/null 2>&1 || true
    gcloud sql instances delete "$TEST_INSTANCE" --quiet
  fi
  ok "test instance, job and secret removed"
}
trap cleanup EXIT

log "Restoring ${SQL_INSTANCE} as it was at ${POINT_IN_TIME} → ${TEST_INSTANCE}"
gcloud sql instances clone "$SQL_INSTANCE" "$TEST_INSTANCE" --point-in-time="$POINT_IN_TIME"
ok "restored"

log "Connection string for the test instance (same users and password as production)"
PROD_URL=$(gcloud secrets versions access latest --secret=database-url)
printf %s "${PROD_URL/$SQL_CONNECTION/$TEST_CONNECTION}" | gcloud secrets create restore-test-database-url \
  --replication-policy=user-managed --locations="$REGION" --data-file=- >/dev/null
unset PROD_URL
gcloud secrets add-iam-policy-binding restore-test-database-url --member="serviceAccount:$(sa sa-migrate)" \
  --role=roles/secretmanager.secretAccessor --quiet >/dev/null

log "Reading the restored database with the release image"
# One line, no "|" characters: the args below use "|" as separator because the script contains commas.
CHECK='const {createPrismaClient}=require("@eul/db");const db=createPrismaClient();(async()=>{const r={users:await db.user.count(),bookings:await db.booking.count(),vehicles:await db.vehicle.count(),auditLogs:await db.auditLog.count()};console.log("RESTORE_CHECK",JSON.stringify(r));if(r.users<1)throw new Error("no users in restored database");await db.$disconnect();})().catch((e)=>{console.error("RESTORE_CHECK_FAILED",e.message);process.exit(1);});'
gcloud run jobs deploy eul-restore-check \
  --image="${IMAGE_BASE}/backend:${TAG}" --region="$REGION" \
  --service-account="$(sa sa-migrate)" --set-cloudsql-instances="$TEST_CONNECTION" \
  --set-secrets=DATABASE_URL=restore-test-database-url:latest \
  --command=node --args="^|^-e|${CHECK}" \
  --max-retries=0 --task-timeout=5m --quiet
gcloud run jobs execute eul-restore-check --region="$REGION" --wait

log "Result"
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=eul-restore-check AND textPayload:RESTORE_CHECK" \
  --limit=1 --freshness=1h --format='value(textPayload)'
ok "Backup restore test PASSED — note the date and the counts above for acceptance check 13."
