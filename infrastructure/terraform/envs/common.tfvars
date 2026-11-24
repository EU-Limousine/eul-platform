# Shared by both environments.
github_repo = "EU-Limousine/eul-platform" # only this repo may deploy (GitHub keyless login)

# Budgets are in the BILLING ACCOUNT's currency (Console → Billing → Account management).
# tf.sh checks this before every plan. Amounts per environment: budget_amount in envs/*.tfvars.
budget_currency = "DKK"
base_domain     = "eulimousine.com"
