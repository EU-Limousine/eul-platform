variable "project_id" {
  description = "Google Cloud project id (eu-limo-staging or eu-limo)."
  type        = string
}

variable "environment" {
  description = "staging or production."
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "region" {
  type    = string
  default = "europe-west1"
}

variable "github_repo" {
  description = "owner/repo allowed to deploy (Workload Identity Federation)."
  type        = string
  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repo)) && var.github_repo != "YOUR-ORG/eul-platform"
    error_message = "Set github_repo in envs/common.tfvars to your GitHub owner/repo."
  }
}

# ── Addresses ────────────────────────────────────────────────────────────────
variable "base_domain" {
  type    = string
  default = "eulimousine.com"
}
variable "web_host" { type = string }
variable "app_host" { type = string }
variable "api_host" { type = string }
variable "www_redirect" {
  description = "Also serve www.<web_host> as a 301 to <web_host> (production)."
  type        = bool
  default     = false
}

# ── Sizes ────────────────────────────────────────────────────────────────────
variable "sql_tier" {
  description = "Cloud SQL machine type."
  type        = string
}
variable "sql_pitr" {
  description = "Point-in-time recovery."
  type        = bool
}
variable "sql_backups" {
  description = "Number of daily backups kept."
  type        = number
}

# ── Switches ─────────────────────────────────────────────────────────────────
variable "noindex" {
  description = "Send X-Robots-Tag: noindex on every response (staging)."
  type        = bool
  default     = false
}
variable "enable_load_balancer" {
  description = <<-EOT
    Create the HTTPS load balancer for the custom domains. Keep false for production until the
    company opens (pre-launch): the next deploy then closes the run.app URLs to the internet.
  EOT
  type        = bool
}
variable "enable_monitoring" {
  description = "Uptime checks and alert emails (production). Uptime checks need the load balancer."
  type        = bool
  default     = false
}
variable "alert_email" {
  description = "Where alerts go (empty = no alerts)."
  type        = string
  default     = ""
}

# ── Budget ───────────────────────────────────────────────────────────────────
variable "budget_amount" {
  description = "Monthly budget in budget_currency (whole units)."
  type        = number
}
variable "budget_currency" {
  description = "Must be the billing account's currency (Console → Billing → Account management)."
  type        = string
  default     = "USD"
}
