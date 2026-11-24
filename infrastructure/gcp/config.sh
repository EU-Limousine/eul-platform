# EU Limousine — Google Cloud settings. Sourced by every script in this folder.
# Edit the values marked EDIT, then run the scripts in order (see README.md).
# Nothing secret belongs in this file: secrets are created by 2-secrets.sh in Secret Manager.

export PROJECT_ID="${PROJECT_ID:-eulimousine-prod}"          # EDIT if your project id differs
export REGION="europe-west1"
export DOMAIN="${DOMAIN:-eulimousine.com}"
export GITHUB_REPO="${GITHUB_REPO:-YOUR-ORG/eul-platform}"   # EDIT: owner/repo on GitHub

# Pre-launch: until a payment provider is chosen (D-01) the API runs the fake payment page.
# Set to false (and PAYMENT_PROVIDER to the real one) for the real launch.
export PRELAUNCH_MODE="${PRELAUNCH_MODE:-true}"
export PAYMENT_PROVIDER="${PAYMENT_PROVIDER:-fake}"

export DEFAULT_CURRENCY="EUR"                                # D-05
export HOME_VARIANT="classic"                                # classic | noir
export CONSENT_CATEGORIES=""                                 # empty until an analytics tool is added

# System emails (D-20). Hostinger SMTP by default; the password is a secret (2-secrets.sh).
export SMTP_HOST="smtp.hostinger.com"
export SMTP_PORT="465"
export SMTP_USER="bookings@${DOMAIN}"
export MAIL_FROM="EU Limousine <bookings@${DOMAIN}>"
export ENQUIRY_EMAIL="info@${DOMAIN}"

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

export WEB_HOST="${DOMAIN}"
export APP_HOST="app.${DOMAIN}"
export API_HOST="api.${DOMAIN}"

sa() { echo "$1@${PROJECT_ID}.iam.gserviceaccount.com"; }
log() { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }

gcloud config set project "$PROJECT_ID" >/dev/null 2>&1
gcloud config set run/region "$REGION" >/dev/null 2>&1
