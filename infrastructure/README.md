# Operational Metrics – Infrastructure

Terraform for GCP: Pub/Sub topic + subscription, BigQuery dataset + events table.

## Prerequisites

- `gcloud` CLI, authenticated.
- GCS bucket for Terraform state (e.g. `operational-metrics-terraform-state-dev`).
- Enable APIs: `pubsub.googleapis.com`, `bigquery.googleapis.com`, `cloudfunctions.googleapis.com`.

## Apply (dev)

```bash
cd infrastructure/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
cp backend.example.hcl backend.dev.hcl   # edit with your GCS state bucket
# Edit terraform.tfvars with your project_id (and optional SA emails).
terraform init -backend-config=backend.dev.hcl
terraform plan
terraform apply
```

## Outputs

- `pubsub_topic_name`: use in app as `PUBSUB_TOPIC_OPERATIONAL_EVENTS` or `GOOGLE_CLOUD_PROJECT` + this name.
- `pubsub_subscription_name`: for the Pub/Sub → BigQuery subscriber (Cloud Function or Run).
- `bigquery_dataset_id`, `bigquery_events_table`: for reports queries and subscriber target.

## Pub/Sub → BigQuery loader

Terraform does not deploy the subscriber. A **Cloud Function** example is in `infrastructure/subscriber-function/`:

```bash
cd infrastructure/subscriber-function
npm install
gcloud functions deploy operational-events-to-bq \
  --gen2 --runtime nodejs20 --trigger-topic operational-events-dev \
  --entry-point onMessage \
  --set-env-vars BIGQUERY_DATASET=operational_metrics_dev,BIGQUERY_EVENTS_TABLE=events \
  --region us-central1 --project YOUR_PROJECT
```

Alternatively: **Cloud Run** (push subscription) or **Dataflow** for higher throughput.

The sample app includes a **direct write** fallback (API route writes to BigQuery when Pub/Sub is not configured) so you can run locally without a subscriber; for production, use Pub/Sub + subscriber.
