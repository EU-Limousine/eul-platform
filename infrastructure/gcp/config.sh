# EU Limousine — Google Cloud settings. Sourced by every script in this folder.
# Choose the environment with EUL_ENV (default: staging, so nothing hits production by accident):
#   EUL_ENV=staging    bash infrastructure/gcp/1-foundation.sh
#   EUL_ENV=production bash infrastructure/gcp/1-foundation.sh
# Nothing secret belongs in this file: secrets are created by 2-secrets.sh in Secret Manager.

export EUL_ENV="${EUL_ENV:-staging}"
export REGION="europe-west1"
export BASE_DOMAIN="eulimousine.com"
export GITHUB_REPO="${GITHUB_REPO:-YOUR-ORG/eul-platform}"   # EDIT: owner/repo on GitHub

case "$EUL_ENV" in
  production)
    export PROJECT_ID="eu-limo"
    export WEB_HOST="${BASE_DOMAIN}"
    export APP_HOST="app.${BASE_DOMAIN}"
    export API_HOST="api.${BASE_DOMAIN}"
    export WWW_REDIRECT="true"                 # www.eulimousine.com → eulimousine.com
    export SQL_TIER="db-custom-1-3840"         # 1 vCPU, 3.75 GB, dedicated core (covered by the SLA)
    export SQL_PITR="true"                     # point-in-time recovery, 14 daily backups
    export SQL_BACKUPS="14"
    export API_MIN_INSTANCES="1"               # no cold start for customers
    export WEB_MIN_INSTANCES="1"
    export NOINDEX="false"
    ;;
  staging)
    export PROJECT_ID="eu-limo-staging"
    export WEB_HOST="staging.${BASE_DOMAIN}"
    export APP_HOST="app-staging.${BASE_DOMAIN}"
    export API_HOST="api-staging.${BASE_DOMAIN}"
    export WWW_REDIRECT="false"
    export SQL_TIER="db-g1-small"              # shared core, cheap, no SLA: fine for testing
    export SQL_PITR="false"
    export SQL_BACKUPS="7"
    export API_MIN_INSTANCES="0"               # scale to zero when nobody tests
    export WEB_MIN_INSTANCES="0"
    export NOINDEX="true"                      # X-Robots-Tag: noindex on every staging response
    ;;
  *) echo "EUL_ENV must be staging or production (got '$EUL_ENV')"; exit 1 ;;
esac

# Pre-launch: until a payment provider is chosen (D-01) the API runs the fake payment page.
# Staging always stays pre-launch. Production switches when the real provider is integrated.
export PRELAUNCH_MODE="${PRELAUNCH_MODE:-true}"
export PAYMENT_PROVIDER="${PAYMENT_PROVIDER:-fake}"

export DEFAULT_CURRENCY="EUR"                                # D-05
export HOME_VARIANT="classic"                                # classic | noir
export CONSENT_CATEGORIES=""                                 # empty until an analytics tool is added

# System emails (D-20). Hostinger SMTP; the password is a secret (2-secrets.sh).
export SMTP_HOST="smtp.hostinger.com"
export SMTP_PORT="465"
export SMTP_USER="bookings@${BASE_DOMAIN}"
export MAIL_FROM="EU Limousine <bookings@${BASE_DOMAIN}>"
export ENQUIRY_EMAIL="info@${BASE_DOMAIN}"

# Cost labels on every resource: Billing → Reports → "Group by: Label" shows cost per part.
export LABELS="app=eulimousine,env=${EUL_ENV}"

# Names (no need to change)
export AR_REPO="eul"
export IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"
export SQL_INSTANCE="eul-pg"
export SQL_DB="eulimousine"
export SQL_USER="eul_app"
export SQL_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
export REDIS_INSTANCE="eul-redis"
export VPC="eul-vpc"
export SUBNET="eul-run-subnet"
export LB_NAME="eul-lb"
export DOMAIN="${WEB_HOST}"

sa() { echo "$1@${PROJECT_ID}.iam.gserviceaccount.com"; }
log() { printf '\n\033[1;33m▶ [%s] %s\033[0m\n' "$EUL_ENV" "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }

gcloud config set project "$PROJECT_ID" >/dev/null 2>&1
gcloud config set run/region "$REGION" >/dev/null 2>&1
