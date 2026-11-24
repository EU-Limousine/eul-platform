# Production: eu-limo.
project_id  = "eu-limo"
environment = "production"

web_host     = "eulimousine.com"
app_host     = "app.eulimousine.com"
api_host     = "api.eulimousine.com"
www_redirect = true

sql_tier    = "db-custom-1-3840" # 1 dedicated vCPU, 3.75 GB (covered by the SLA)
sql_pitr    = true
sql_backups = 14

noindex = false
# Pre-launch: keep false until a payment provider is live (D-01) and the company opens.
# Then set true, apply, add the printed DNS records in Cloudflare, and re-run the production deploy.
enable_load_balancer = false
enable_monitoring    = true
alert_email          = "" # EDIT: e.g. "ops@eulimousine.com" (uptime alerts start with the load balancer)

budget_amount = 250 # in budget_currency
