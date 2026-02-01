#!/usr/bin/env bash
# Deploy operational-metrics Next.js app to Google Cloud Run.
# Prerequisites: gcloud CLI, Terraform-applied project (Pub/Sub + BigQuery).
# Set PROJECT_ID (env or first arg). Optionally set REGION, SERVICE_NAME, ENV.

set -e

PROJECT_ID="${OPERATIONAL_METRICS_PROJECT:-${1}}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-operational-metrics}"
ENV="${ENV:-dev}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Usage: PROJECT_ID=your-gcp-project ./scripts/deploy-cloud-run.sh"
  echo "   or: ./scripts/deploy-cloud-run.sh your-gcp-project"
  echo "Set REGION, SERVICE_NAME, ENV as needed (defaults: us-central1, operational-metrics, dev)."
  exit 1
fi

echo "Deploying to Cloud Run"
echo "  Project: $PROJECT_ID"
echo "  Region:  $REGION"
echo "  Service: $SERVICE_NAME"
echo "  Env:     $ENV (topic: operational-events-${ENV}, dataset: operational_metrics_${ENV})"

# Topic and dataset names must match Terraform (dev: operational-events-dev, operational_metrics_dev)
PUBSUB_TOPIC="operational-events-${ENV}"
BQ_DATASET="operational_metrics_${ENV}"
BQ_TABLE="events"

gcloud config set project "$PROJECT_ID"

echo "Building and deploying from source (Dockerfile)..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID,PUBSUB_TOPIC_OPERATIONAL_EVENTS=$PUBSUB_TOPIC,BIGQUERY_DATASET=$BQ_DATASET,BIGQUERY_EVENTS_TABLE=$BQ_TABLE" \
  --quiet

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')
echo ""
echo "Deployment complete."
echo "  App:      $SERVICE_URL"
echo "  Health:   $SERVICE_URL/api/health"
echo "  Reports:  $SERVICE_URL/reports"
echo ""
echo "If the app gets 403 from Pub/Sub or BigQuery, grant the Cloud Run service account:"
echo "  SA=\$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(spec.template.spec.serviceAccountName)' || true)"
echo "  If SA is empty, Cloud Run uses the default compute SA: PROJECT_NUMBER-compute@developer.gserviceaccount.com"
echo "  Add that SA in Terraform: publisher_service_account and bigquery_loader_service_account, then terraform apply"
echo "  Or grant manually: roles/pubsub.publisher on topic $PUBSUB_TOPIC, roles/bigquery.dataEditor on dataset $BQ_DATASET"
