# Pub/Sub topic for operational events (ingest pipeline)

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "topic_name" {
  description = "Pub/Sub topic name for operational events"
  type        = string
  default     = "operational-events"
}

resource "google_pubsub_topic" "operational_events" {
  name    = "${var.topic_name}-${var.environment}"
  project = var.project_id

  labels = {
    environment = var.environment
    purpose     = "operational-metrics"
  }
}

# Subscription for writing to BigQuery (pull by Cloud Function or push to Run)
variable "create_subscription" {
  description = "Create a subscription for BQ loader"
  type        = bool
  default     = true
}

variable "subscription_ack_deadline_seconds" {
  description = "Acknowledgement deadline in seconds"
  type        = number
  default     = 60
}

resource "google_pubsub_subscription" "to_bigquery" {
  count = var.create_subscription ? 1 : 0

  name    = "${var.topic_name}-to-bigquery-${var.environment}"
  topic   = google_pubsub_topic.operational_events.name
  project = var.project_id

  ack_deadline_seconds = var.subscription_ack_deadline_seconds

  labels = {
    environment = var.environment
    purpose     = "operational-metrics-bq"
  }

  expiration_policy {
    ttl = "" # never expire
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

output "topic_id" {
  description = "Pub/Sub topic ID"
  value       = google_pubsub_topic.operational_events.id
}

output "topic_name" {
  description = "Pub/Sub topic name"
  value       = google_pubsub_topic.operational_events.name
}

output "subscription_id" {
  description = "Subscription ID for BQ loader"
  value       = var.create_subscription ? google_pubsub_subscription.to_bigquery[0].id : null
}

output "subscription_name" {
  description = "Subscription name for BQ loader"
  value       = var.create_subscription ? google_pubsub_subscription.to_bigquery[0].name : null
}
