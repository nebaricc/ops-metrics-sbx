# Operational Metrics – Plan & Architecture

## Goals

- **Ingest**: Capture operational events from Web and Mobile apps (login, page views, operator/mechanic tasks).
- **Store**: GCP BigQuery as the data warehouse; Pub/Sub as an optional intermediary for async, scalable ingestion.
- **Report**: Surface usage back to the application layer so SaaS tenant admins can see their org’s usage in-app.

This app provides **infrastructure**, a **core SDK/library**, and a **small Next.js sample app** that mirrors how the real project will use the system.

---

## Event Model (First Iteration)

Aligned with the “Events Needed for First Iteration” summary:

| Category        | Event Type       | Web | Mobile | Purpose                 |
|----------------|------------------|-----|--------|-------------------------|
| **Login**      | App Open         | ✓   | ✓      | Track which users logged in |
| **Page Views** | Dashboard        | ✓   | ✓      | Track page visits       |
|                 | Fleet/Equipment   | ✓   | ✓      | Track page visits       |
|                 | Inspections      | ✓   | ✓      | Track page visits       |
|                 | Work Orders      | ✓   | ✓      | Track page visits       |
|                 | Maintenance Items| ✓   | ✓      | Track page visits       |
|                 | Jobs             | ✓   | -      | Track page visits       |
|                 | Operator Dashboard | -  | ✓      | Track page visits       |
| **Operator Tasks** | Create Inspection | ✓ | ✓   | Role compliance         |
| **Mechanic Tasks** | Create Work Order | ✓ | ✓  | Role compliance         |
|                 | Update Work Order | ✓   | ✓      | Role compliance         |

All events are **tenant-scoped** (`organization_id`) and include `platform` (web | mobile), `user_id`, and `timestamp`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Web / Mobile Apps (diggit-web, diggit-mobile)                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  @operational-metrics/sdk (or lib from this app)                       │  │
│  │  • track(eventType, payload)                                          │  │
│  │  • pageView(pageName)                                                 │  │
│  │  • appOpen() / createInspection() / createWorkOrder() / updateWorkOrder│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP POST /api/events (batch or single)
┌─────────────────────────────────────────────────────────────────────────────┐
│  Application Layer (Next.js API / Backend)                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Ingest API: validate tenant, enrich, publish to Pub/Sub (or write BQ)│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Publish JSON message
┌─────────────────────────────────────────────────────────────────────────────┐
│  GCP Pub/Sub                                                                │
│  Topic: operational-events                                                  │
│  Subscription: operational-events-to-bigquery (push or pull)                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Consume message, insert row
┌─────────────────────────────────────────────────────────────────────────────┐
│  BigQuery                                                                   │
│  Dataset: operational_metrics_<env>                                         │
│  Table: events (partitioned by event_date, clustered by org, event_type)    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Query (tenant-scoped)
┌─────────────────────────────────────────────────────────────────────────────┐
│  Reports API (same app or separate service)                                 │
│  GET /api/reports/usage?org=...&from=...&to=...                             │
│  → Aggregations: logins, page views by page, inspections, work orders       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  In-App Reports UI (tenant admin)                                           │
│  Usage dashboard: who logged in, page visits, operator/mechanic activity    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Infrastructure (Terraform)

- **Pub/Sub**
  - Topic: `operational-events` (or `operational_events_<env>`).
  - Subscription: push to Cloud Run service or pull by a Cloud Function that writes to BigQuery.
- **BigQuery**
  - Dataset: `operational_metrics_<env>`.
  - Table: `events` – one row per event; schema includes `organization_id`, `event_type`, `platform`, `user_id`, `event_time`, `payload` (JSON), plus derived `event_date` for partitioning.
- **IAM**
  - App/Cloud Run: publish to topic.
  - Subscriber (Cloud Function/Run): read from subscription, write to BigQuery.

### 2. Core SDK (lib/)

- **Event types**: Enum/const for Login, PageView, OperatorTask, MechanicTask and specific events (App Open, Dashboard, Fleet/Equipment, Create Inspection, etc.).
- **Client API** (browser/mobile):
  - `track(eventType, payload?)` – generic.
  - `pageView(pageName)` – convenience for page views.
  - `appOpen()`, `createInspection(payload)`, `createWorkOrder(payload)`, `updateWorkOrder(payload)` – convenience for first-iteration events.
- **Context**: Every call includes `organization_id`, `user_id`, `platform` (web | mobile); these can be set once (e.g. after login) or per request.
- **Delivery**: Client sends to app backend `POST /api/events` (single or batch). No direct Pub/Sub from client (keeps credentials on server).

### 3. Ingest API (Next.js API route or backend)

- **POST /api/events**
  - Body: `{ events: [{ eventType, payload?, timestamp? }] }` or single event.
  - Enriches with `organization_id`, `user_id`, `platform` from session/headers.
  - Validates tenant and event types.
  - Publishes each event (as JSON) to Pub/Sub topic.
- **Subscriber** (Cloud Function or Cloud Run):
  - Reads from Pub/Sub subscription.
  - Parses message, maps to BigQuery row.
  - Inserts into `events` table (with retries/idempotency if needed).

### 4. Reports API & In-App Reports

- **GET /api/reports/usage**
  - Query params: `organization_id`, `from`, `to`, optional `groupBy` (day/week/month).
  - Runs BigQuery (or cached/materialized views) for:
    - Unique users (logins / App Open).
    - Page views by page (Dashboard, Fleet, Inspections, etc.).
    - Counts: Create Inspection, Create Work Order, Update Work Order.
  - Returns JSON for the in-app reports UI.
- **In-app reports UI**
  - Tenant-admin only; shows usage summary, charts/tables for the selected org and date range.

### 5. Sample Next.js App (this repo)

- **Purpose**: Demonstrate SDK usage and same infra as production.
- **Pages**: Dashboard, Fleet/Equipment, Inspections, Work Orders, Maintenance Items, Jobs, Operator Dashboard (demo).
- **Behavior**:
  - On load: call `appOpen()` or `pageView(pageName)`.
  - Simulated actions: “Create Inspection”, “Create Work Order”, “Update Work Order” buttons that call SDK and show success.
- **Reports**: A `/reports` page that calls `GET /api/reports/usage` and displays tenant usage (with mock or real BQ depending on env).

---

## File Layout (This App)

```
apps/operational-metrics/
├── PLAN.md                          # This document
├── README.md                        # Setup, run, deploy
├── package.json
├── tsconfig.json
├── next.config.mjs
├── .env.example
├── lib/                             # Core SDK + server helpers
│   ├── events/
│   │   ├── types.ts                 # EventType, categories, payloads
│   │   ├── client.ts                # Browser SDK: track(), pageView(), etc.
│   │   └── index.ts
│   ├── pubsub.ts                    # Server: publish to Pub/Sub
│   └── bigquery.ts                  # Server: query BQ for reports (optional)
├── app/
│   ├── layout.tsx
│   ├── page.tsx                     # Home with links to demo pages
│   ├── dashboard/
│   ├── fleet/
│   ├── inspections/
│   ├── work-orders/
│   ├── maintenance/
│   ├── jobs/
│   ├── operator-dashboard/
│   ├── reports/                     # Tenant admin usage reports
│   └── api/
│       ├── events/route.ts          # POST ingest → Pub/Sub
│       └── reports/usage/route.ts   # GET usage from BQ
├── infrastructure/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── pubsub/
│   │   │   ├── bigquery-events/
│   │   │   └── subscriber/          # Optional: Cloud Function Sub → BQ
│   │   └── environments/
│   │       └── dev/
│   └── README.md
└── components/                      # Sample UI (optional)
```

---

## Implementation Order

1. **Scaffold**: Next.js app, package.json, tsconfig, env.
2. **Infrastructure**: Terraform for Pub/Sub (topic + subscription), BigQuery (dataset + `events` table), IAM; optional subscriber (Cloud Function) to write Pub/Sub → BQ.
3. **SDK**: Event types, client `track`/`pageView`/convenience methods, server publish to Pub/Sub.
4. **Ingest**: POST /api/events → validate → publish to Pub/Sub; deploy subscriber so events land in BQ.
5. **Reports**: GET /api/reports/usage (BQ or mock), reports UI for tenant admins.
6. **Sample pages**: All listed pages using SDK; buttons for Create Inspection / Create Work Order / Update Work Order.

---

## Tenant Isolation & Security

- Every event and report is scoped by `organization_id`.
- Ingest API: resolve `organization_id` from auth/session; reject or ignore if missing.
- Reports API: only return data for the tenant the authenticated user belongs to; enforce in SQL (`WHERE organization_id = ?`) and in API layer.

---

## Future Extensions

- **Batch ingestion**: Client sends arrays of events; server batches publish to Pub/Sub.
- **Dataflow**: Replace Cloud Function with Dataflow pipeline for very high throughput.
- **Materialized views / scheduled queries**: Pre-aggregate usage by org/day for faster reports.
- **Alerting**: Pub/Sub → monitoring or Slack when thresholds are crossed.
