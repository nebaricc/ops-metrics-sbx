import { BigQuery } from "@google-cloud/bigquery";
import type { OperationalEvent } from "./events/types";

let bigquery: BigQuery | null = null;

/**
 * Insert a single event row into BigQuery.
 * Use when Pub/Sub subscriber is not deployed (e.g. local dev) or as fallback.
 */
export async function insertEvent(event: OperationalEvent): Promise<void> {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) {
    console.warn("[operational-metrics] BigQuery not configured (GOOGLE_CLOUD_PROJECT)");
    return;
  }

  if (!bigquery) {
    bigquery = new BigQuery({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
  }

  const datasetId = process.env.BIGQUERY_DATASET ?? "operational_metrics_dev";
  const tableId = process.env.BIGQUERY_EVENTS_TABLE ?? "events";
  const rows = [
    {
      event_id: event.event_id ?? null,
      organization_id: event.organization_id,
      user_id: event.user_id,
      event_type: event.event_type,
      event_category: event.event_category,
      platform: event.platform,
      event_time: event.event_time,
      event_date: event.event_date ?? event.event_time.slice(0, 10),
      payload: event.payload ? JSON.stringify(event.payload) : null,
      inserted_at: event.inserted_at ?? new Date().toISOString(),
    },
  ];

  await bigquery.dataset(datasetId).table(tableId).insert(rows);
}

/**
 * Query usage for a tenant: logins, page views by type, task counts.
 */
export interface UsageReport {
  organizationId: string;
  from: string;
  to: string;
  uniqueUsers: number;
  appOpens: number;
  pageViews: { eventType: string; count: number }[];
  createInspections: number;
  createWorkOrders: number;
  updateWorkOrders: number;
}

export async function getUsageReport(
  organizationId: string,
  from: string, // YYYY-MM-DD
  to: string
): Promise<UsageReport | null> {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const dataset = process.env.BIGQUERY_DATASET ?? "operational_metrics_dev";
  const table = process.env.BIGQUERY_EVENTS_TABLE ?? "events";
  if (!project) return null;

  if (!bigquery) {
    bigquery = new BigQuery({ projectId: project });
  }

  const fullTable = `${project}.${dataset}.${table}`;
  const query = `
    SELECT
      COUNTIF(event_type = 'app_open') AS app_opens,
      COUNT(DISTINCT user_id) AS unique_users,
      COUNTIF(event_type = 'create_inspection') AS create_inspections,
      COUNTIF(event_type = 'create_work_order') AS create_work_orders,
      COUNTIF(event_type = 'update_work_order') AS update_work_orders
    FROM \`${fullTable}\`
    WHERE organization_id = @orgId AND event_date BETWEEN @from AND @to
  `;

  const [job] = await bigquery.createQueryJob({
    query,
    params: { orgId: organizationId, from, to },
  });
  const [rows] = await job.getQueryResults();
  const row = rows?.[0];

  const pvQuery = `
    SELECT event_type, COUNT(*) AS cnt
    FROM \`${fullTable}\`
    WHERE organization_id = @orgId AND event_date BETWEEN @from AND @to
      AND event_type LIKE 'page_view_%'
    GROUP BY event_type
  `;
  const [pvJob] = await bigquery.createQueryJob({
    query: pvQuery,
    params: { orgId: organizationId, from, to },
  });
  const [pvRows] = await pvJob.getQueryResults();

  return {
    organizationId,
    from,
    to,
    uniqueUsers: Number(row?.unique_users ?? 0),
    appOpens: Number(row?.app_opens ?? 0),
    pageViews: (pvRows ?? []).map((r: { event_type: string; cnt: string }) => ({
      eventType: r.event_type,
      count: Number(r.cnt),
    })),
    createInspections: Number(row?.create_inspections ?? 0),
    createWorkOrders: Number(row?.create_work_orders ?? 0),
    updateWorkOrders: Number(row?.update_work_orders ?? 0),
  };
}

/** Single row for audit trail */
export interface AuditEvent {
  event_time: string;
  user_id: string | null;
  event_type: string;
  payload: string | null;
}

/**
 * Query audit trail: who did what, by time. Optional filter by user and event type.
 */
export async function getAuditEvents(
  organizationId: string,
  from: string,
  to: string,
  userId?: string | null,
  eventType?: string | null
): Promise<AuditEvent[]> {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const dataset = process.env.BIGQUERY_DATASET ?? "operational_metrics_dev";
  const table = process.env.BIGQUERY_EVENTS_TABLE ?? "events";
  if (!project) return [];

  if (!bigquery) {
    bigquery = new BigQuery({ projectId: project });
  }

  const fullTable = `${project}.${dataset}.${table}`;
  const userFilter = userId ? " AND user_id = @userId" : "";
  const eventTypeFilter = eventType ? " AND event_type = @eventType" : "";
  const query = `
    SELECT event_time, user_id, event_type, payload
    FROM \`${fullTable}\`
    WHERE organization_id = @orgId AND event_date BETWEEN @from AND @to${userFilter}${eventTypeFilter}
    ORDER BY event_time ASC
  `;

  const params: Record<string, string> = { orgId: organizationId, from, to };
  if (userId) params.userId = userId;
  if (eventType) params.eventType = eventType;

  const [job] = await bigquery.createQueryJob({ query, params });
  const [rows] = await job.getQueryResults();
  return (rows ?? []).map((r: Record<string, unknown>) => ({
    event_time: r.event_time instanceof Date ? r.event_time.toISOString() : typeof r.event_time === "string" ? r.event_time : String((r.event_time as { value?: string })?.value ?? r.event_time ?? ""),
    user_id: (r.user_id as string) ?? null,
    event_type: String(r.event_type ?? ""),
    payload: (r.payload as string) ?? null,
  }));
}
