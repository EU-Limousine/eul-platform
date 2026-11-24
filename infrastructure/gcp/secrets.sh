#!/usr/bin/env bash
# Secret VALUES (after `tf.sh apply`, which created the empty secrets and who may read them).
# Run in Cloud Shell:
#   EUL_ENV=staging    bash infrastructure/gcp/secrets.sh
#   EUL_ENV=production bash infrastructure/gcp/secrets.sh
# Generated values (database password, JWT secret…) never leave Google Cloud.
# Values you type (SMTP password, keys) are read hidden and never echoed or logged.
# Secrets that already have a value are kept. To change one later:
#   printf %s 'NEW VALUE' | gcloud secrets versions add NAME --data-file=-   (then redeploy)
set -euo pipefail
source "$(dirname "$0")/config.sh"

TURNSTILE_TEST_SECRET="1x0000000000000000000000000000000AA"

gcloud secrets describe database-url >/dev/null 2>&1 \
  || { echo "The secrets do not exist yet. Run first: EUL_ENV=$EUL_ENV bash infrastructure/terraform/tf.sh apply"; exit 1; }

has() { [ -n "$(gcloud secrets versions list "$1" --filter='state=ENABLED' --limit=1 --format='value(name)' 2>/dev/null)" ]; }
put() { printf %s "$2" | gcloud secrets versions add "$1" --data-file=- >/dev/null; ok "set $1"; }
ask() { local v; read -r -s -p "  $1: " v; echo >&2; printf %s "$v"; }
rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "${1:-40}"; }

log "Database user and connection string"
if has database-url; then ok "database-url has a value (kept)"; else
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
if has redis-url; then ok "redis-url has a value (kept)"; else
  REDIS_HOST=$(gcloud redis instances describe "$REDIS_INSTANCE" --region="$REGION" --format='value(host)')
  REDIS_AUTH=$(gcloud redis instances get-auth-string "$REDIS_INSTANCE" --region="$REGION" --format='value(authString)')
  put redis-url "redis://:${REDIS_AUTH}@${REDIS_HOST}:6379/0"
  unset REDIS_AUTH
fi

log "Generated secrets"
if has jwt-access-secret; then ok "jwt-access-secret has a value (kept)"; else put jwt-access-secret "$(rand 64)"; fi
if has fake-payment-secret; then ok "fake-payment-secret has a value (kept)"; else put fake-payment-secret "$(rand 40)"; fi

log "Values you enter (input is hidden)"
if has smtp-pass; then ok "smtp-pass has a value (kept)"; else
  echo "  SMTP password for ${SMTP_USER} (Hostinger → Emails → that mailbox's password)."
  put smtp-pass "$(ask 'SMTP password')"
fi

if has google-maps-server-key; then ok "google-maps-server-key has a value (kept)"; else
  echo "  Google Maps SERVER key of THIS project (APIs & Services → Credentials;"
  echo "  restrict it to Places API (New) + Routes API)."
  put google-maps-server-key "$(ask 'Maps server key')"
fi

if has turnstile-secret; then ok "turnstile-secret has a value (kept)"; else
  echo "  Cloudflare Turnstile SECRET key. Leave EMPTY on staging (Cloudflare's test key is used,"
  echo "  so automated tests are never stopped). Production needs a real key before launch."
  T="$(ask 'Turnstile secret')"
  if [ -z "$T" ]; then
    [ "$PRELAUNCH_MODE" = "true" ] || { echo "A real Turnstile secret is required when PRELAUNCH_MODE=false"; exit 1; }
    T="$TURNSTILE_TEST_SECRET"
  fi
  put turnstile-secret "$T"; unset T
fi

if has seed-admin-password; then ok "seed-admin-password has a value (kept)"; else
  echo "  Password for the first dashboard admin (at least 12 characters)."
  [ "$EUL_ENV" = "staging" ] && echo "  Use the SAME password you gave github-setup.ps1 (the end-to-end tests log in with it)."
  P="$(ask 'Admin password')"
  [ "${#P}" -ge 12 ] || { echo "Too short (min 12)."; exit 1; }
  put seed-admin-password "$P"; unset P
fi

log "Done. Next: GitHub variables from 'EUL_ENV=$EUL_ENV bash infrastructure/terraform/tf.sh output'"
