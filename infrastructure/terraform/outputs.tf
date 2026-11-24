output "github_environment_variables" {
  description = "Add these to GitHub → Settings → Environments → <environment> → Environment variables."
  value = {
    GCP_PROJECT_ID   = var.project_id
    GCP_WIF_PROVIDER = google_iam_workload_identity_pool_provider.github.name
    GCP_DEPLOYER     = google_service_account.sa["sa-deployer"].email
  }
}

output "dns_records" {
  description = "Cloudflare → DNS: A records, each DNS only (grey cloud). Empty while enable_load_balancer = false."
  value = local.lb ? [
    for host in local.cert_domains : {
      type  = "A"
      name  = host == var.base_domain ? "@" : trimsuffix(host, ".${var.base_domain}")
      value = google_compute_global_address.lb[0].address
      proxy = "DNS only (grey cloud)"
    }
  ] : []
}

output "certificate_check" {
  description = "Run this to see when the HTTPS certificate is ACTIVE."
  value       = local.lb ? "gcloud compute ssl-certificates describe eul-cert --global --project=${var.project_id} --format='value(managed.status,managed.domainStatus)'" : "load balancer disabled"
}

output "image_base" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "sql_connection_name" {
  value = google_sql_database_instance.main.connection_name
}
