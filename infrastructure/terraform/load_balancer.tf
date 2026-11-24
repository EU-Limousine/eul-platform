# HTTPS load balancer for the custom domains (enable_load_balancer = true).
# Cloud Run domain mappings are not used: Google marks them Preview, not for production.
#   <web_host> → eul-web    <app_host> → eul-dashboard    <api_host> → eul-api (WebSockets supported)
#   www.<web_host> → 301 to <web_host> when www_redirect = true
# The Cloud Run services themselves are created by deploy.sh; a serverless NEG may point at a
# service that does not exist yet. Once this load balancer exists, the next deploy sets Cloud Run
# ingress to "internal-and-cloud-load-balancing", closing the run.app URLs.

locals {
  lb       = var.enable_load_balancer
  backends = local.lb ? { web = "eul-web", api = "eul-api", dashboard = "eul-dashboard" } : {}
  cert_domains = concat(
    [var.web_host],
    var.www_redirect ? ["www.${var.web_host}"] : [],
    [var.app_host, var.api_host],
  )
}

resource "google_compute_global_address" "lb" {
  count      = local.lb ? 1 : 0
  name       = "eul-lb-ip"
  depends_on = [google_project_service.apis]
}

resource "google_compute_region_network_endpoint_group" "neg" {
  for_each              = local.backends
  name                  = "neg-${each.key}"
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = each.value
  }
  depends_on = [google_project_service.apis] # Compute Engine API must be on first
}

resource "google_compute_backend_service" "be" {
  for_each              = local.backends
  name                  = "be-${each.key}"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  # Staging: search engines must never list it.
  custom_response_headers = var.noindex ? ["X-Robots-Tag: noindex, nofollow"] : []
  backend {
    group = google_compute_region_network_endpoint_group.neg[each.key].id
  }
}

resource "google_compute_url_map" "main" {
  count           = local.lb ? 1 : 0
  name            = "eul-lb" # deploy.sh checks for this name
  default_service = google_compute_backend_service.be["web"].id

  host_rule {
    hosts        = [var.app_host]
    path_matcher = "dashboard"
  }
  host_rule {
    hosts        = [var.api_host]
    path_matcher = "api"
  }
  dynamic "host_rule" {
    for_each = var.www_redirect ? [1] : []
    content {
      hosts        = ["www.${var.web_host}"]
      path_matcher = "www"
    }
  }

  path_matcher {
    name            = "dashboard"
    default_service = google_compute_backend_service.be["dashboard"].id
  }
  path_matcher {
    name            = "api"
    default_service = google_compute_backend_service.be["api"].id
  }
  dynamic "path_matcher" {
    for_each = var.www_redirect ? [1] : []
    content {
      name = "www"
      default_url_redirect {
        host_redirect          = var.web_host
        https_redirect         = true
        redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
        strip_query            = false
      }
    }
  }
}

# Becomes ACTIVE 15–60 minutes after the DNS records point at the IP (Cloudflare, DNS only).
resource "google_compute_managed_ssl_certificate" "main" {
  count = local.lb ? 1 : 0
  name  = "eul-cert"
  managed {
    domains = local.cert_domains
  }
  depends_on = [google_project_service.apis]
}

resource "google_compute_target_https_proxy" "main" {
  count            = local.lb ? 1 : 0
  name             = "eul-https-proxy"
  url_map          = google_compute_url_map.main[0].id
  ssl_certificates = [google_compute_managed_ssl_certificate.main[0].id]
}

resource "google_compute_global_forwarding_rule" "https" {
  count                 = local.lb ? 1 : 0
  name                  = "eul-https"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.lb[0].id
  port_range            = "443"
  target                = google_compute_target_https_proxy.main[0].id
}

# HTTP (80) → HTTPS redirect
resource "google_compute_url_map" "http_redirect" {
  count = local.lb ? 1 : 0
  name  = "eul-http-redirect"
  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
  depends_on = [google_project_service.apis]
}

resource "google_compute_target_http_proxy" "redirect" {
  count   = local.lb ? 1 : 0
  name    = "eul-http-proxy"
  url_map = google_compute_url_map.http_redirect[0].id
}

resource "google_compute_global_forwarding_rule" "http" {
  count                 = local.lb ? 1 : 0
  name                  = "eul-http"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.lb[0].id
  port_range            = "80"
  target                = google_compute_target_http_proxy.redirect[0].id
}
