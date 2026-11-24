#!/usr/bin/env bash
# Send all traffic back to the PREVIOUS release (code only) for API, worker, website and dashboard.
#   EUL_ENV=production bash infrastructure/gcp/rollback.sh
# Used automatically when the production smoke test fails, and by the "Rollback" workflow.
# Database migrations are NOT undone: migrations must be backwards-compatible
# (expand → migrate → contract, CLAUDE.md §5), so the previous code still works with the new schema.
# The next normal deploy moves traffic to the new release again (deploy.sh uses --to-latest).
set -euo pipefail
source "$(dirname "$0")/config.sh"

log "Rolling back ${EUL_ENV} to the previous release"
for S in eul-api eul-worker eul-web eul-dashboard; do
  CURRENT=$(gcloud run services describe "$S" --region="$REGION" --format='value(status.traffic[0].revisionName)')
  # Newest first; take the first READY revision older than the one serving now.
  PREVIOUS=$(gcloud run revisions list --service="$S" --region="$REGION" \
    --sort-by='~metadata.creationTimestamp' \
    --format='value(metadata.name,status.conditions[0].status)' \
    | awk -v cur="$CURRENT" 'found && $2=="True" {print $1; exit} $1==cur {found=1}')
  if [ -z "$PREVIOUS" ]; then
    echo "  ! $S: no earlier revision to go back to (serving $CURRENT)"; continue
  fi
  gcloud run services update-traffic "$S" --region="$REGION" --to-revisions="${PREVIOUS}=100" --quiet >/dev/null
  ok "$S: $CURRENT → $PREVIOUS"
done
log "Done. Check: bash infrastructure/gcp/smoke.sh ${EUL_ENV}"
