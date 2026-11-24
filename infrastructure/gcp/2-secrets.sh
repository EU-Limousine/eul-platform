#!/usr/bin/env bash
# Step 2 — Secrets in Secret Manager (EU region only). Run in Cloud Shell:
#   bash infrastructure/gcp/2-secrets.sh
# Generated values (database password, JWT secret…) never leave Google Cloud.
# Values you type (SMTP password, keys) are read hidden and are never echoed or logged.
# Existing secrets are kept. To change one later:
#   printf %s 'NEW VALUE' | gcloud secrets versions add NAME --data-file=-   (then redeploy)
set -euo pipefail
source "$(dirname "$0")/config.sh"

TURNSTILE_TEST_SECRET="1x0000000000000000000000000000000AA"

has() { gcloud secrets describe "$1" >/dev/null 2>&1; }
put() { # name value
  printf %s "$2" | gcloud secrets create "$1" --replication-policy=user-managed --locations="$REGION" --data-file=- >/dev/null
  ok "created $1"
}
ask() { # name prompt → hidden input
  local v
  read -r -s -p "  $2: " v; echo >&2
  printf %s "$v"
}
rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "${1:-40}"; }

log "Database user and connection string"
if has database-url; then ok "database-url exists (kept)"; else
  DB_PASSWORD="$(rand 40)"
  if gcloud sql users list --instance="$SQL_INSTANCE" --format='value(name)' | grep -qx "$SQL_USER"; then
    gcloud sql users set-password "$SQL_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD" >/dev/null
  else
    gcloud sql users create "$SQL_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD" >/dev/null
  fi
  # Unix socket of the Cloud SQL connector that Cloud Run mounts at /cloudsql/<connection name>.
  put database-url "postgresql://${SQL_USER}:${DB_PASSWORD}@localhost/${SQL_DB}?host=/cloudsql/${SQL_CONNECTION}"
  unset DB_PASSWORD
fi

log "Redis connection string"
if has redis-url; then ok "redis-url exists (kept)"; else
  REDIS_HOST=$(gcloud redis instances describe "$REDIS_INSTANCE" --region="$REGION" --format='value(host)')
  REDIS_AUTH=$(gcloud redis instances get-auth-string "$REDIS_INSTANCE" --region="$REGION" --format='value(authString)')
  put redis-url "redis://:${REDIS_AUTH}@${REDIS_HOST}:6379/0"
  unset REDIS_AUTH
fi

log "Generated secrets"
has jwt-access-secret && ok "jwt-access-secret exists (kept)" || put jwt-access-secret "$(rand 64)"
has fake-payment-secret && ok "fake-payment-secret exists (kept)" || put fake-payment-secret "$(rand 40)"

log "Values you enter (input is hidden)"
if has smtp-pass; then ok "smtp-pass exists (kept)"; else
  echo "  SMTP password for ${SMTP_USER} (Hostinger → Emails → that mailbox's password)."
  put smtp-pass "$(ask smtp-pass 'SMTP password')"
fi

if has google-maps-server-key; then ok "google-maps-server-key exists (kept)"; else
  echo "  Google Maps SERVER key (APIs & Services → Credentials; restrict it to Places API (New) + Routes API)."
  put google-maps-server-key "$(ask google-maps-server-key 'Maps server key')"
fi

if has turnstile-secret; then ok "turnstile-secret exists (kept)"; else
  echo "  Cloudflare Turnstile SECRET key (Cloudflare dashboard → Turnstile → your site)."
  echo "  Leave empty to use Cloudflare's test secret — only allowed while PRELAUNCH_MODE=true."
  T="$(ask turnstile-secret 'Turnstile secret')"
  if [ -z "$T" ]; then
    [ "$PRELAUNCH_MODE" = "true" ] || { echo "A real Turnstile secret is required when PRELAUNCH_MODE=false"; exit 1; }
    T="$TURNSTILE_TEST_SECRET"
  fi
  put turnstile-secret "$T"; unset T
fi

if has seed-admin-password; then ok "seed-admin-password exists (kept)"; else
  echo "  Password for the first dashboard admin (at least 12 characters). You log in with it."
  P="$(ask seed-admin-password 'Admin password')"
  [ "${#P}" -ge 12 ] || { echo "Too short (min 12)."; exit 1; }
  put seed-admin-password "$P"; unset P
fi

log "Who may read which secret"
grant() { gcloud secrets add-iam-policy-binding "$1" --member="serviceAccount:$(sa "$2")" \
  --role=roles/secretmanager.secretAccessor --condition=None --quiet >/dev/null; }
for S in database-url redis-url jwt-access-secret turnstile-secret google-maps-server-key fake-payment-secret; do grant "$S" sa-api; done
for S in database-url redis-url smtp-pass; do grant "$S" sa-worker; done
for S in database-url seed-admin-password; do grant "$S" sa-migrate; done
ok "sa-api, sa-worker and sa-migrate can read only their own secrets"

log "Done. Next: EUL_ENV=$EUL_ENV bash infrastructure/gcp/3-github.sh"
