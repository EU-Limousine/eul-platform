#!/usr/bin/env bash
# Step 5 — Uptime checks + email alerts (run once the domains work).
#   ALERT_EMAIL=ops@eulimousine.com bash infrastructure/gcp/5-monitoring.sh
# Checks the website and the API health endpoint from several regions every 5 minutes, and emails
# when either fails for 5 minutes or the worker (BullMQ: confirmations, timers) is not running.
set -euo pipefail
source "$(dirname "$0")/config.sh"
ALERT_EMAIL="${ALERT_EMAIL:?set ALERT_EMAIL=you@example.com}"

log "Email notification channel"
CHANNEL=$(gcloud beta monitoring channels list --filter="labels.email_address=\"${ALERT_EMAIL}\"" --format='value(name)' | head -1)
if [ -z "$CHANNEL" ]; then
  CHANNEL=$(gcloud beta monitoring channels create --type=email --display-name="EU Limousine ops" \
    --channel-labels=email_address="$ALERT_EMAIL" --format='value(name)')
fi
ok "$CHANNEL (Google sends a verification email the first time)"

log "Uptime checks"
add_uptime() { # name host path
  gcloud monitoring uptime list-configs --filter="displayName=\"$1\"" --format='value(name)' | grep -q . \
    || gcloud monitoring uptime create "$1" --resource-type=uptime-url \
      --resource-labels="host=$2,project_id=${PROJECT_ID}" --path="$3" --protocol=https \
      --period=5 --timeout=10 >/dev/null
  ok "$1 → https://$2$3"
}
add_uptime "eul-website" "$WEB_HOST" "/en"
add_uptime "eul-api-health" "$API_HOST" "/health"

log "Alert policies"
policy() { # display-name file
  gcloud alpha monitoring policies list --filter="displayName=\"$1\"" --format='value(name)' | grep -q . \
    && { ok "$1 exists"; return; }
  gcloud alpha monitoring policies create --policy-from-file="$2" >/dev/null
  ok "$1"
}

F=$(mktemp)
cat >"$F" <<EOF
displayName: "EU Limousine: website or API down"
combiner: OR
notificationChannels: ["${CHANNEL}"]
conditions:
- displayName: "Uptime check failing"
  conditionThreshold:
    filter: 'metric.type="monitoring.googleapis.com/uptime_check/check_passed" AND resource.type="uptime_url"'
    aggregations:
    - alignmentPeriod: 300s
      perSeriesAligner: ALIGN_NEXT_OLDER
      crossSeriesReducer: REDUCE_COUNT_FALSE
      groupByFields: ["resource.label.host"]
    comparison: COMPARISON_GT
    thresholdValue: 1
    duration: 300s
EOF
policy "EU Limousine: website or API down" "$F"

cat >"$F" <<EOF
displayName: "EU Limousine: worker not running"
combiner: OR
notificationChannels: ["${CHANNEL}"]
conditions:
- displayName: "eul-worker has no running instance"
  conditionAbsent:
    filter: 'metric.type="run.googleapis.com/container/instance_count" AND resource.type="cloud_run_revision" AND resource.label.service_name="eul-worker"'
    aggregations:
    - alignmentPeriod: 300s
      perSeriesAligner: ALIGN_MAX
    duration: 600s
EOF
policy "EU Limousine: worker not running" "$F"
rm -f "$F"

log "Done. Also set a monthly budget with alerts: Console → Billing → Budgets & alerts."
