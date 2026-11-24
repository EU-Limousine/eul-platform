# Staging: eu-limo-staging. Cheap sizes, scales to zero, hidden from search engines.
project_id  = "eu-limo-staging"
environment = "staging"

web_host     = "staging.eulimousine.com"
app_host     = "app-staging.eulimousine.com"
api_host     = "api-staging.eulimousine.com"
www_redirect = false

sql_tier    = "db-g1-small" # shared core, no SLA: fine for testing
sql_pitr    = false
sql_backups = 7

noindex              = true
enable_load_balancer = true  # staging is reachable at its own addresses
enable_monitoring    = false # it sleeps at night (staging-sleep.sh): alerts would fire
alert_email          = ""

budget_amount = 150 # in budget_currency
