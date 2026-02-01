# Development environment: operational metrics (Pub/Sub + BigQuery)

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "operational-metrics-terraform-state-dev"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

locals {
  environment = "dev"
  app_name    = "operational-metrics"
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "pubsub.googleapis.com",
    "bigquery.googleapis.com",
    "cloudfunctions.googleapis.com"
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# Pub/Sub: topic + subscription for operational events
module "pubsub" {
  source = "../../modules/pubsub"

  project_id   = var.project_id
  environment = local.environment
  topic_name  = "operational-events"

  create_subscription         = true
  subscription_ack_deadline_seconds = 60

  depends_on = [google_project_service.required_apis]
}

# BigQuery: dataset + events table
module "bigquery_events" {
  source = "../../modules/bigquery-events"

  project_id  = var.project_id
  environment = local.environment
  location    = "US"

  delete_contents_on_destroy = true

  depends_on = [google_project_service.required_apis]
}

# IAM: grant Pub/Sub publisher to the app service account (e.g. Cloud Run SA)
variable "publisher_service_account" {
  description = "Service account email that will publish events (e.g. Cloud Run SA)"
  type        = string
  default     = ""
}

resource "google_pubsub_topic_iam_member" "publisher" {
  count = var.publisher_service_account != "" ? 1 : 0

  project = var.project_id
  topic   = module.pubsub.topic_name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${var.publisher_service_account}"
}

# BigQuery: grant data editor to the subscriber/reports SA (e.g. Cloud Function/Run)
variable "bigquery_loader_service_account" {
  description = "Service account email that writes to BQ (subscriber) and runs reports"
  type        = string
  default     = ""
}

resource "google_bigquery_dataset_iam_member" "data_editor" {
  count = var.bigquery_loader_service_account != "" ? 1 : 0

  dataset_id = module.bigquery_events.dataset_id
  project    = var.project_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${var.bigquery_loader_service_account}"
}

# Outputs
output "pubsub_topic_name" {
  description = "Pub/Sub topic name for operational events"
  value       = module.pubsub.topic_name
}

output "pubsub_subscription_name" {
  description = "Pub/Sub subscription name for BQ loader"
  value       = module.pubsub.subscription_name
}

output "bigquery_dataset_id" {
  description = "BigQuery dataset ID"
  value       = module.bigquery_events.dataset_id
}

output "bigquery_events_table" {
  description = "Fully qualified BigQuery events table"
  value       = module.bigquery_events.fully_qualified_table
}
