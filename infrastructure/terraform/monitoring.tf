# Monthly budget with email alerts (always), and uptime + worker alerts (enable_monitoring).

# ── Budget: only warns, never switches anything off ─────────────────────────────
# Alerts go to the billing account's admins at 50 %, 90 %, 100 % and when Google forecasts > 100 %.
resource "google_billing_budget" "monthly" {
  billing_account = data.google_project.this.billing_account
  display_name    = "EU Limousine ${var.environment} (monthly)"

  budget_filter {
    projects        = ["projects/${data.google_project.this.number}"]
    calendar_period = "MONTH"
  }

  amount {
    specified_amount {
      currency_code = var.budget_currency
      units         = tostring(var.budget_amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  depends_on = [google_project_service.apis]
}

# ── Alerts by email ──────────────────────────────────────────────────────────────
locals {
  alerts        = var.enable_monitoring && var.alert_email != ""
  uptime_checks = local.alerts && var.enable_load_balancer ? { "eul-website" = { host = var.web_host, path = "/en" }, "eul-api-health" = { host = var.api_host, path = "/health" } } : {}
}

resource "google_monitoring_notification_channel" "email" {
  count        = local.alerts ? 1 : 0
  display_name = "EU Limousine ${var.environment} ops"
  type         = "email"
  labels       = { email_address = var.alert_email }
  depends_on   = [google_project_service.apis]
}

resource "google_monitoring_uptime_check_config" "check" {
  for_each     = local.uptime_checks
  display_name = each.key
  timeout      = "10s"
  period       = "300s"

  http_check {
    path         = each.value.path
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type   = "uptime_url"
    labels = { project_id = var.project_id, host = each.value.host }
  }
}

resource "google_monitoring_alert_policy" "down" {
  count                 = length(local.uptime_checks) > 0 ? 1 : 0
  display_name          = "EU Limousine ${var.environment}: website or API down"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.email[0].name]

  conditions {
    display_name = "Uptime check failing for 5 minutes"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }
    }
  }

  depends_on = [google_monitoring_uptime_check_config.check]
}

# The worker sends confirmation emails and runs timers: alert when it is not running.
resource "google_monitoring_alert_policy" "worker" {
  count                 = local.alerts ? 1 : 0
  display_name          = "EU Limousine ${var.environment}: worker not running"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.email[0].name]

  conditions {
    display_name = "eul-worker has no running instance for 10 minutes"
    condition_absent {
      filter   = "metric.type=\"run.googleapis.com/container/instance_count\" AND resource.type=\"cloud_run_revision\" AND resource.label.service_name=\"eul-worker\""
      duration = "600s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MAX"
      }
    }
  }
}
