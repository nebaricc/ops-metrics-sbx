# BigQuery dataset and events table for operational metrics

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "location" {
  description = "BigQuery dataset location"
  type        = string
  default     = "US"
}

variable "delete_contents_on_destroy" {
  description = "Delete dataset contents when destroying"
  type        = bool
  default     = false
}

resource "google_bigquery_dataset" "operational_metrics" {
  dataset_id                 = "operational_metrics_${var.environment}"
  friendly_name              = "Operational Metrics - ${title(var.environment)}"
  description                = "Operational events for tenant usage and compliance (login, page views, operator/mechanic tasks)"
  location                   = var.location
  delete_contents_on_destroy = var.delete_contents_on_destroy

  labels = {
    environment = var.environment
    purpose     = "operational-metrics"
  }
}

# Single events table: one row per event (aligned with first-iteration event types)
resource "google_bigquery_table" "events" {
  dataset_id = google_bigquery_dataset.operational_metrics.dataset_id
  table_id   = "events"

  description = "Operational events: app open, page views, create inspection, create/update work order"

  schema = jsonencode([
    {
      name        = "event_id"
      type        = "STRING"
      mode        = "NULLABLE"
      description = "Client-generated id for idempotency"
    },
    {
      name        = "organization_id"
      type        = "STRING"
      mode        = "REQUIRED"
      description = "Tenant (org) identifier"
    },
    {
      name        = "user_id"
      type        = "STRING"
      mode        = "NULLABLE"
      description = "User who triggered the event"
    },
    {
      name        = "event_type"
      type        = "STRING"
      mode        = "REQUIRED"
      description = "e.g. app_open, page_view_dashboard, create_inspection, create_work_order, update_work_order"
    },
    {
      name        = "event_category"
      type        = "STRING"
      mode        = "NULLABLE"
      description = "login | page_view | operator_task | mechanic_task"
    },
    {
      name        = "platform"
      type        = "STRING"
      mode        = "NULLABLE"
      description = "web | mobile"
    },
    {
      name        = "event_time"
      type        = "TIMESTAMP"
      mode        = "REQUIRED"
      description = "Event timestamp (client or server)"
    },
    {
      name        = "event_date"
      type        = "DATE"
      mode        = "NULLABLE"
      description = "Derived date for partitioning (DATE(event_time))"
    },
    {
      name        = "payload"
      type        = "JSON"
      mode        = "NULLABLE"
      description = "Event-specific payload (e.g. page_name, work_order_id)"
    },
    {
      name        = "inserted_at"
      type        = "TIMESTAMP"
      mode        = "NULLABLE"
      description = "When the row was inserted (pipeline)"
    }
  ])

  time_partitioning {
    type                     = "DAY"
    field                    = "event_date"
    require_partition_filter = false
  }

  clustering = ["organization_id", "event_type", "event_date"]
}

output "dataset_id" {
  description = "BigQuery dataset ID"
  value       = google_bigquery_dataset.operational_metrics.dataset_id
}

output "events_table_id" {
  description = "Events table ID"
  value       = google_bigquery_table.events.table_id
}

output "fully_qualified_table" {
  description = "Fully qualified table name (project.dataset.table)"
  value       = "${var.project_id}.${google_bigquery_dataset.operational_metrics.dataset_id}.${google_bigquery_table.events.table_id}"
}
