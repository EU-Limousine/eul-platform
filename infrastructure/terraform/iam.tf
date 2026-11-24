# Service accounts (one per role, least privilege), secret containers, GitHub keyless login.

locals {
  runtime_accounts = ["sa-web", "sa-api", "sa-worker", "sa-migrate"]

  project_roles = merge(
    { for pair in setproduct(local.runtime_accounts, ["roles/logging.logWriter", "roles/monitoring.metricWriter", "roles/cloudtrace.agent"]) :
    "${pair[0]}|${pair[1]}" => { account = pair[0], role = pair[1] } },
    { for sa in ["sa-api", "sa-worker", "sa-migrate"] :
    "${sa}|roles/cloudsql.client" => { account = sa, role = "roles/cloudsql.client" } },
    # Deployer (GitHub Actions): push images, deploy Cloud Run, run jobs, wake a sleeping staging database.
    { for role in ["roles/run.admin", "roles/artifactregistry.writer", "roles/compute.viewer", "roles/cloudsql.editor"] :
    "sa-deployer|${role}" => { account = "sa-deployer", role = role } },
  )

  # Secret → who may read it. Values are added by infrastructure/gcp/secrets.sh, never here.
  secrets = {
    "database-url"           = ["sa-api", "sa-worker", "sa-migrate"]
    "redis-url"              = ["sa-api", "sa-worker"]
    "jwt-access-secret"      = ["sa-api"]
    "turnstile-secret"       = ["sa-api"]
    "google-maps-server-key" = ["sa-api"]
    "fake-payment-secret"    = ["sa-api"]
    "smtp-pass"              = ["sa-worker"]
    "seed-admin-password"    = ["sa-migrate"]
  }
  secret_access = {
    for pair in flatten([for secret, readers in local.secrets : [for sa in readers : { secret = secret, account = sa }]]) :
    "${pair.secret}|${pair.account}" => pair
  }
}

resource "google_service_account" "sa" {
  for_each     = toset(concat(local.runtime_accounts, ["sa-deployer"]))
  account_id   = each.value
  display_name = each.value
  depends_on   = [google_project_service.apis]
}

resource "google_project_iam_member" "roles" {
  for_each = local.project_roles
  project  = var.project_id
  role     = each.value.role
  member   = "serviceAccount:${google_service_account.sa[each.value.account].email}"
}

# The deployer may run services and jobs as the runtime accounts.
resource "google_service_account_iam_member" "deployer_acts_as" {
  for_each           = toset(local.runtime_accounts)
  service_account_id = google_service_account.sa[each.value].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.sa["sa-deployer"].email}"
}

# ── Secret Manager: empty containers, stored only in the EU region ──────────────
resource "google_secret_manager_secret" "secret" {
  for_each  = local.secrets
  secret_id = each.key
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_iam_member" "access" {
  for_each  = local.secret_access
  secret_id = google_secret_manager_secret.secret[each.value.secret].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.sa[each.value.account].email}"
}

# ── GitHub Actions → Google Cloud without keys (Workload Identity Federation) ───
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"
  depends_on                = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
  # Only this repository can obtain tokens.
  attribute_condition = "assertion.repository == '${var.github_repo}'"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_deployer" {
  service_account_id = google_service_account.sa["sa-deployer"].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}
