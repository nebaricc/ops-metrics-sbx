# Operational Metrics

Operational metrics for SaaS tenant usage: **ingest** (login, page views, task actions) via **Pub/Sub** → **BigQuery**, with **in-app reports** for tenant admins.

This app includes:

- **Infrastructure** (Terraform): Pub/Sub topic + subscription, BigQuery dataset + `events` table
- **Core SDK** (`lib/events`): event types, `track()`, `pageView()`, `appOpen()`, `createInspection()`, `createWorkOrder()`, `updateWorkOrder()`
- **Ingest API**: `POST /api/events` → publish to Pub/Sub (or direct BigQuery fallback)
- **Reports API**: `GET /api/reports/usage` → tenant usage from BigQuery
- **Sample Next.js app**: demo pages and a tenant usage reports UI

## Events (first iteration)

| Category        | Event type           | Purpose                 |
|----------------|----------------------|-------------------------|
| Login          | `app_open`           | Track which users logged in |
| Page views     | `page_view_*`        | Track page visits       |
| Task: check    | `create_inspection`  | Record a check          |
| Task: order   | `create_work_order`, `update_work_order` | Create/update task |

All events are tenant-scoped (`organization_id`) and include `platform` (web | mobile) and `user_id`.

## Quick start

```bash
cp .env.example .env
# Set GOOGLE_CLOUD_PROJECT (and optionally PUBSUB_TOPIC_OPERATIONAL_EVENTS, BIGQUERY_*).
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Navigate to Dashboard, Assets, Checks, Tasks, etc.; use “Create check” and “Create task” / “Update task” to send events. Visit **Reports** to see tenant usage (empty until BigQuery is configured and events are written).

**If the app or API returns 500 or "Cannot find module" in dev:** the Next.js cache can get into a bad state. Run `npm run dev:clean` (clears `.next` and starts dev) or: `rm -rf .next && npm run dev`.

## SDK usage (real project)

1. **Copy or depend on** `lib/events` (and optionally `lib/pubsub`, `lib/bigquery` if your backend runs in this repo).

2. **Set context** after login:
   ```ts
   import { setMetricsContext } from "@/lib/events";
   setMetricsContext({
     organizationId: org.id,
     userId: user.id,
     platform: "web", // or "mobile"
   });
   ```

3. **Track app open** once per session:
   ```ts
   import { appOpen } from "@/lib/events";
   appOpen();
   ```

4. **Track page views** on each screen:
   ```ts
   import { pageView } from "@/lib/events";
   pageView("dashboard");   // or "fleet", "inspections", "work-orders", etc.
   ```

5. **Track actions**:
   ```ts
   import { createInspection, createWorkOrder, updateWorkOrder } from "@/lib/events";
   createInspection({ inspection_id: "..." });
   createWorkOrder({ work_order_id: "..." });
   updateWorkOrder({ work_order_id: "..." });
   ```

6. **Backend**: `POST /api/events` with body `{ events: [{ eventType, payload?, timestamp? }] }`. Enrich with `organization_id`, `user_id`, `platform` from auth; publish to Pub/Sub (or write to BigQuery). Use headers `x-organization-id`, `x-user-id`, `x-platform` if the client does not send context.

## Infrastructure

See [infrastructure/README.md](infrastructure/README.md). Summary:

1. **Terraform** (dev):
   ```bash
   cd infrastructure/terraform/environments/dev
   cp terraform.tfvars.example terraform.tfvars
   # Set project_id (and optional SA emails).
   terraform init && terraform apply
   ```
2. **Env** for the app (after Terraform):
   - `GOOGLE_CLOUD_PROJECT`
   - `PUBSUB_TOPIC_OPERATIONAL_EVENTS` (e.g. `operational-events-dev`)
   - Optional: `BIGQUERY_DATASET`, `BIGQUERY_EVENTS_TABLE` (defaults: `operational_metrics_dev`, `events`)

3. **Pub/Sub → BigQuery**: Terraform creates the topic and subscription; you deploy a **subscriber** (Cloud Function or Cloud Run) that reads messages and inserts into the BigQuery `events` table. Until that is deployed, the ingest API falls back to **direct BigQuery insert** when Pub/Sub is not configured (e.g. local dev without Pub/Sub).

## Deploy to GCP (Cloud Run)

Deploy the Next.js app to Cloud Run so it runs in the same project as your Terraform-provisioned Pub/Sub and BigQuery.

**Prerequisites**

- `gcloud` CLI installed and authenticated (`gcloud auth login`, `gcloud config set project YOUR_PROJECT`)
- Terraform already applied (topic `operational-events-<env>`, dataset `operational_metrics_<env>`)

**Deploy**

```bash
# From the app root (apps/operational-metrics)
PROJECT_ID=your-gcp-project ./scripts/deploy-cloud-run.sh
# Or: npm run deploy -- your-gcp-project
```

The script builds from source using the included `Dockerfile` and deploys to Cloud Run with env vars: `GOOGLE_CLOUD_PROJECT`, `PUBSUB_TOPIC_OPERATIONAL_EVENTS`, `BIGQUERY_DATASET`, `BIGQUERY_EVENTS_TABLE`. Defaults are for `ENV=dev` (topic `operational-events-dev`, dataset `operational_metrics_dev`).

**After first deploy:** Grant the Cloud Run service account access so the app can publish to Pub/Sub and write/query BigQuery. Either:

1. **Terraform**: Set `publisher_service_account` and `bigquery_loader_service_account` in `terraform.tfvars` to the Cloud Run service account (e.g. `PROJECT_NUMBER-compute@developer.gserviceaccount.com`), then `terraform apply`.
2. **Manual**: Grant `roles/pubsub.publisher` on the topic and `roles/bigquery.dataEditor` on the dataset to that account.

Health check: `https://YOUR_SERVICE_URL/api/health`.

## Reports

- **API**: `GET /api/reports/usage?organizationId=...&from=YYYY-MM-DD&to=YYYY-MM-DD`
- **UI**: `/reports` in the sample app (tenant admin view).

Reports show: app opens (logins), unique users, page views by type, create inspection / create work order / update work order counts. Tenant isolation is enforced by `organization_id` in the API and in BigQuery.
