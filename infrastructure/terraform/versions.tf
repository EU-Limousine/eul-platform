terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 8.0"
    }
  }

  # State lives in a versioned bucket inside each project (created by bootstrap.sh).
  # tf.sh passes bucket and prefix: terraform init -backend-config=bucket=<project>-tfstate
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region

  # Budgets and some APIs are billed to / checked against this project.
  user_project_override = true
  billing_project       = var.project_id

  # Every resource that supports labels gets these (Billing → Reports → group by label).
  default_labels = local.labels
}
