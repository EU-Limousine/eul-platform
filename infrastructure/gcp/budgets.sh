#!/usr/bin/env bash
# Monthly budget + email alerts for one project (run once per project, in Cloud Shell):
#   EUL_ENV=staging    bash infrastructure/gcp/budgets.sh
#   EUL_ENV=production bash infrastructure/gcp/budgets.sh
# Alerts go to the billing account's admins at 50 %, 90 % and 100 % of the budget, and when
# Google FORECASTS the month will end above 100 %. A budget only warns: it never stops services.
# Amounts are in your billing account's currency. Defaults assume USD; override, e.g.:
#   BUDGET=60000 EUL_ENV=production bash infrastructure/gcp/budgets.sh   (if the account is in PKR)
set -euo pipefail
source "$(dirname "$0")/config.sh"

ACCOUNT=$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingAccountName)' | sed 's#billingAccounts/##')
[ -n "$ACCOUNT" ] || { echo "Project $PROJECT_ID has no billing account linked."; exit 1; }
CURRENCY=$(gcloud billing accounts describe "$ACCOUNT" --format='value(currencyCode)' 2>/dev/null || echo "?")

case "$EUL_ENV" in
  production) DEFAULT_BUDGET=250 ;;
  staging) DEFAULT_BUDGET=150 ;;
esac
if [ -z "${BUDGET:-}" ] && [ "$CURRENCY" != "USD" ]; then
  echo "Your billing account is in ${CURRENCY}. Run again with BUDGET=<amount in ${CURRENCY}>"
  echo "(suggested: about ${DEFAULT_BUDGET} USD converted to ${CURRENCY})."
  exit 1
fi
AMOUNT="${BUDGET:-$DEFAULT_BUDGET}"
NAME="EU Limousine ${EUL_ENV} (monthly)"

log "Budget ${AMOUNT} ${CURRENCY}/month for ${PROJECT_ID} on billing account ${ACCOUNT}"
if gcloud billing budgets list --billing-account="$ACCOUNT" --format='value(displayName)' | grep -qxF "$NAME"; then
  ok "budget \"$NAME\" exists (change it in Console → Billing → Budgets & alerts)"
else
  PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
  gcloud billing budgets create \
    --billing-account="$ACCOUNT" \
    --display-name="$NAME" \
    --budget-amount="${AMOUNT}${CURRENCY}" \
    --filter-projects="projects/${PROJECT_NUMBER}" \
    --calendar-period=month \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.9 \
    --threshold-rule=percent=1.0 \
    --threshold-rule=percent=1.0,basis=forecasted-spend >/dev/null
  ok "created \"$NAME\""
fi

cat <<EOF

Where to watch the money:
  • Console → Billing → Reports: filter Project = ${PROJECT_ID}; Group by "Service" or by Label
    "component" (api, worker, website, dashboard, database, redis, images…) to see each part's cost.
  • Billing → Budgets & alerts: add more email addresses under "Manage notifications".
EOF
