#!/usr/bin/env bash
# Read-only smoke test of a deployed environment. Never creates, changes or deletes data,
# so it is safe on production. Used by the deploy workflows; also handy by hand:
#   bash infrastructure/gcp/smoke.sh staging|production
# Uses the real addresses; before the DNS records exist it falls back to the run.app URLs
# (needs gcloud, logged in to that project).
set -uo pipefail
export EUL_ENV="${1:-${EUL_ENV:-staging}}"
source "$(dirname "$0")/config.sh" 2>/dev/null || true

WEB="https://${WEB_HOST}"; APP="https://${APP_HOST}"; API="https://${API_HOST}"
if ! curl -fsS -o /dev/null --max-time 10 "${API}/health" 2>/dev/null; then
  if command -v gcloud >/dev/null && gcloud run services describe eul-api --region="$REGION" >/dev/null 2>&1; then
    echo "• ${API_HOST} not reachable yet → testing the run.app addresses"
    WEB=$(gcloud run services describe eul-web --region="$REGION" --format='value(status.url)')
    APP=$(gcloud run services describe eul-dashboard --region="$REGION" --format='value(status.url)')
    API=$(gcloud run services describe eul-api --region="$REGION" --format='value(status.url)')
  fi
fi

FAILED=0
check() { # name url expected-status [text that must appear]
  local body code
  body=$(mktemp)
  for attempt in 1 2 3; do  # a fresh revision may need a few seconds for its first request
    code=$(curl -sS -o "$body" -w '%{http_code}' --max-time 20 "$2" 2>/dev/null || echo 000)
    [ "$code" = "$3" ] && break
    sleep 5
  done
  if [ "$code" != "$3" ]; then
    printf '  ✗ %-34s %s → %s (expected %s)\n' "$1" "$2" "$code" "$3"; FAILED=1
  elif [ -n "${4:-}" ] && ! grep -q "$4" "$body"; then
    printf '  ✗ %-34s %s → missing "%s"\n' "$1" "$2" "$4"; FAILED=1
  else
    printf '  ✓ %-34s %s\n' "$1" "$2"
  fi
  rm -f "$body"
}

echo "Smoke test: ${EUL_ENV}"
check "API health (database)"            "${API}/health" 200 '"status":"ok"'
check "API public vehicle classes"       "${API}/public/vehicle-categories" 200
check "API rejects missing login"        "${API}/bookings" 401
check "Website home (English)"           "${WEB}/en" 200 '<h1'
check "Website service page (Danish)"    "${WEB}/da/services/airport-transfers" 200 '<h1'
check "Website booking page"             "${WEB}/en/book" 200
check "Website sitemap"                  "${WEB}/sitemap.xml" 200 '<urlset'
check "Website 404 page"                 "${WEB}/en/this-page-does-not-exist" 404
check "Dashboard"                        "${APP}/" 200 '<div id="root"'
check "Dashboard runtime config"         "${APP}/config.js" 200 'apiUrl'

if [ "$FAILED" = 1 ]; then echo "SMOKE TEST FAILED"; exit 1; fi
echo "Smoke test passed"
