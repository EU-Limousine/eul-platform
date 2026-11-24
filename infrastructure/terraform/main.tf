# EU Limousine — Google Cloud platform for one environment (staging or production).
# Terraform owns what rarely changes. Releases (images, Cloud Run services, migrations) stay in
# infrastructure/gcp/deploy.sh, run by GitHub Actions. Secret VALUES are never in Terraform:
# it creates the empty secrets and their permissions; infrastructure/gcp/secrets.sh adds the values.

locals {
  labels = { app = "eulimousine", env = var.environment }

  apis = [
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "compute.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudtrace.googleapis.com",
    "billingbudgets.googleapis.com",
    "cloudbilling.googleapis.com",
    # Google Maps Platform, called by the API with the server key: address search + route/price.
    "places.googleapis.com", # Places API (New)
    "routes.googleapis.com", # Routes API
  ]
}

data "google_project" "this" {}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

# ── Network: Cloud Run reaches Redis through Direct VPC egress ──────────────────
resource "google_compute_network" "vpc" {
  name                    = "eul-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "run" {
  name          = "eul-run-subnet"
  network       = google_compute_network.vpc.id
  region        = var.region
  ip_cidr_range = "10.10.0.0/24"
}

# ── Cloud SQL (PostgreSQL 17) ───────────────────────────────────────────────────
# Public IP WITHOUT authorised networks: nobody can connect directly. Cloud Run connects only
# through the Cloud SQL connector (Unix socket, encrypted, IAM role cloudsql.client).
resource "google_sql_database_instance" "main" {
  name                = "eul-pg"
  database_version    = "POSTGRES_17"
  region              = var.region
  deletion_protection = true # Terraform refuses to delete it

  settings {
    edition                     = "ENTERPRISE"
    tier                        = var.sql_tier
    disk_type                   = "PD_SSD"
    disk_size                   = 10
    disk_autoresize             = true
    deletion_protection_enabled = true # Google refuses to delete it
    user_labels                 = merge(local.labels, { component = "database" })

    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "01:00"
      point_in_time_recovery_enabled = var.sql_pitr
      backup_retention_settings {
        retained_backups = var.sql_backups
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day  = 7 # Sunday
      hour = 3
    }
  }

  lifecycle {
    # staging-sleep.sh stops and starts the database; that is not drift.
    ignore_changes = [settings[0].activation_policy]
  }

  depends_on = [google_project_service.apis]
}

resource "google_sql_database" "app" {
  name     = "eulimousine"
  instance = google_sql_database_instance.main.name
}
# The database user eul_app is created by secrets.sh, so its password never enters Terraform state.

# ── Memorystore Redis 7.2 (BullMQ) ──────────────────────────────────────────────
resource "google_redis_instance" "main" {
  name               = "eul-redis"
  region             = var.region
  tier               = "BASIC"
  memory_size_gb     = 1
  redis_version      = "REDIS_7_2"
  authorized_network = google_compute_network.vpc.id
  connect_mode       = "DIRECT_PEERING"
  auth_enabled       = true
  # noeviction: queued jobs and timers must never be dropped silently (CLAUDE.md §2).
  redis_configs = { "maxmemory-policy" = "noeviction" }
  labels        = { component = "redis" }
  depends_on    = [google_project_service.apis]
}

# ── Artifact Registry (Docker images) ───────────────────────────────────────────
resource "google_artifact_registry_repository" "images" {
  location               = var.region
  repository_id          = "eul"
  format                 = "DOCKER"
  description            = "EU Limousine images"
  labels                 = { component = "images" }
  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "keep-10-newest"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }
  cleanup_policies {
    id     = "delete-older"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "86400s"
    }
  }

  depends_on = [google_project_service.apis]
}
