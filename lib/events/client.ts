"use client";

import {
  EventType,
  EventTypeValue,
  type ClientEventPayload,
  type Platform,
} from "./types";

const ENDPOINT = "/api/events";

/** Context set once (e.g. after login) and sent with every event */
export interface MetricsContext {
  organizationId: string;
  userId: string | null;
  platform: Platform;
}

/** Captured event + context for debug display */
export interface SentEventDebug {
  eventType: EventTypeValue;
  payload?: Record<string, unknown>;
  context: { organizationId: string; userId: string; platform: string };
  timestamp: string;
  callName: string;
}

let context: MetricsContext | null = null;
let lastSentEvent: SentEventDebug | null = null;
let appOpenSentEvent: SentEventDebug | null = null;
let appOpenSentFromPage: string | null = null;
const eventsByPage: Record<string, SentEventDebug> = {};
let debugCallback: ((event: SentEventDebug) => void) | null = null;

export function setMetricsDebugCallback(cb: ((event: SentEventDebug) => void) | null): void {
  debugCallback = cb;
}

export function getLastSentEvent(): SentEventDebug | null {
  return lastSentEvent;
}

export function getAppOpenSentEvent(): SentEventDebug | null {
  return appOpenSentEvent;
}

/** Pathname where app_open was sent (once per session). For debug footer. */
export function getAppOpenSentFromPage(): string | null {
  return appOpenSentFromPage;
}

/** Event sent on this page (keyed by pathname). Use for debug footer. */
export function getEventForPage(pathname: string): SentEventDebug | null {
  return eventsByPage[pathname] ?? null;
}

/** Set current pathname so track() can record events per page. Called by app layout. */
export function setMetricsCurrentPage(pathname: string): void {
  if (typeof window !== "undefined") {
    (window as unknown as { __METRICS_CURRENT_PAGE__?: string }).__METRICS_CURRENT_PAGE__ = pathname;
  }
}

/**
 * Set the tenant/user context for all subsequent events.
 * Call after login or when org/user is known.
 */
export function setMetricsContext(ctx: MetricsContext): void {
  context = ctx;
}

export function getMetricsContext(): MetricsContext | null {
  return context;
}

/**
 * Send a single event to the ingest API.
 * Context (org, user, platform) must be set via setMetricsContext() and is sent as headers so events are stored for the selected tenant/user.
 */
export async function track(
  eventType: EventTypeValue,
  payload?: Record<string, unknown>
): Promise<void> {
  const ctx = getMetricsContext();
  const timestamp = new Date().toISOString();
  const body: { events: ClientEventPayload[] } = {
    events: [
      {
        eventType,
        payload: payload ?? undefined,
        timestamp,
      },
    ],
  };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ctx) {
    headers["x-organization-id"] = ctx.organizationId;
    headers["x-user-id"] = ctx.userId ?? "";
    headers["x-platform"] = ctx.platform;
  }
  const callName = eventType === EventType.APP_OPEN ? "appOpen()" : eventType.startsWith("page_view_") ? `pageView('${(payload?.page_name as string) ?? eventType}')` : `track('${eventType}', …)`;
  const debug: SentEventDebug = {
    eventType,
    payload: payload ?? undefined,
    context: { organizationId: ctx?.organizationId ?? "", userId: ctx?.userId ?? "", platform: ctx?.platform ?? "web" },
    timestamp,
    callName,
  };
  lastSentEvent = debug;
  const currentPage =
    typeof window !== "undefined"
      ? (window as unknown as { __METRICS_CURRENT_PAGE__?: string }).__METRICS_CURRENT_PAGE__
      : undefined;
  if (eventType === EventType.APP_OPEN) {
    appOpenSentEvent = debug;
    if (currentPage) appOpenSentFromPage = currentPage;
  } else if (currentPage) {
    eventsByPage[currentPage] = debug;
  }
  debugCallback?.(debug);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn("[operational-metrics] track failed:", res.status, await res.text());
    }
  } catch (e) {
    console.warn("[operational-metrics] track error:", e);
  }
}

/**
 * Track a page view by page name (maps to EventType).
 */
export async function pageView(pageName: string): Promise<void> {
  const mapping: Record<string, EventTypeValue> = {
    dashboard: EventType.PAGE_VIEW_DASHBOARD,
    fleet: EventType.PAGE_VIEW_FLEET,
    "fleet/equipment": EventType.PAGE_VIEW_FLEET,
    inspections: EventType.PAGE_VIEW_INSPECTIONS,
    "work-orders": EventType.PAGE_VIEW_WORK_ORDERS,
    work_orders: EventType.PAGE_VIEW_WORK_ORDERS,
    maintenance: EventType.PAGE_VIEW_MAINTENANCE,
    "maintenance-items": EventType.PAGE_VIEW_MAINTENANCE,
    jobs: EventType.PAGE_VIEW_JOBS,
    "operator-dashboard": EventType.PAGE_VIEW_OPERATOR_DASHBOARD,
  };
  const eventType = mapping[pageName.toLowerCase()] ?? EventType.PAGE_VIEW_DASHBOARD;
  await track(eventType, { page_name: pageName });
}

/** Track app open (login) – call once per session after auth */
export function appOpen(): void {
  track(EventType.APP_OPEN).catch(() => {});
}

/** Create check (e.g. inspection) */
export function createInspection(payload?: { inspection_id?: string; [k: string]: unknown }): void {
  track(EventType.CREATE_INSPECTION, payload).catch(() => {});
}

/** Mechanic task: create work order */
export function createWorkOrder(payload?: { work_order_id?: string; [k: string]: unknown }): void {
  track(EventType.CREATE_WORK_ORDER, payload).catch(() => {});
}

/** Mechanic task: update work order */
export function updateWorkOrder(payload?: { work_order_id?: string; [k: string]: unknown }): void {
  track(EventType.UPDATE_WORK_ORDER, payload).catch(() => {});
}
