/**
 * Operational metrics event types – first iteration.
 * Aligned with: Login, Page Views, Operator Tasks, Mechanic Tasks.
 */

export const EventCategory = {
  LOGIN: "login",
  PAGE_VIEW: "page_view",
  OPERATOR_TASK: "operator_task",
  MECHANIC_TASK: "mechanic_task",
} as const;

export type EventCategoryType = (typeof EventCategory)[keyof typeof EventCategory];

/** Event type strings sent to backend and stored in BQ */
export const EventType = {
  // Login
  APP_OPEN: "app_open",

  // Page views (Web + Mobile unless noted)
  PAGE_VIEW_DASHBOARD: "page_view_dashboard",
  PAGE_VIEW_FLEET: "page_view_fleet",
  PAGE_VIEW_INSPECTIONS: "page_view_inspections",
  PAGE_VIEW_WORK_ORDERS: "page_view_work_orders",
  PAGE_VIEW_MAINTENANCE: "page_view_maintenance",
  PAGE_VIEW_JOBS: "page_view_jobs",           // Web only
  PAGE_VIEW_OPERATOR_DASHBOARD: "page_view_operator_dashboard", // Mobile only

  // Operator tasks
  CREATE_INSPECTION: "create_inspection",

  // Mechanic tasks
  CREATE_WORK_ORDER: "create_work_order",
  UPDATE_WORK_ORDER: "update_work_order",
} as const;

export type EventTypeValue = (typeof EventType)[keyof typeof EventType];

/** Map event type -> category for BQ */
export const EVENT_TYPE_TO_CATEGORY: Record<EventTypeValue, EventCategoryType> = {
  [EventType.APP_OPEN]: EventCategory.LOGIN,
  [EventType.PAGE_VIEW_DASHBOARD]: EventCategory.PAGE_VIEW,
  [EventType.PAGE_VIEW_FLEET]: EventCategory.PAGE_VIEW,
  [EventType.PAGE_VIEW_INSPECTIONS]: EventCategory.PAGE_VIEW,
  [EventType.PAGE_VIEW_WORK_ORDERS]: EventCategory.PAGE_VIEW,
  [EventType.PAGE_VIEW_MAINTENANCE]: EventCategory.PAGE_VIEW,
  [EventType.PAGE_VIEW_JOBS]: EventCategory.PAGE_VIEW,
  [EventType.PAGE_VIEW_OPERATOR_DASHBOARD]: EventCategory.PAGE_VIEW,
  [EventType.CREATE_INSPECTION]: EventCategory.OPERATOR_TASK,
  [EventType.CREATE_WORK_ORDER]: EventCategory.MECHANIC_TASK,
  [EventType.UPDATE_WORK_ORDER]: EventCategory.MECHANIC_TASK,
};

export type Platform = "web" | "mobile";

/** Payload sent from client to POST /api/events */
export interface ClientEventPayload {
  eventType: EventTypeValue;
  payload?: Record<string, unknown>;
  timestamp?: string; // ISO
}

/** Enriched event as published to Pub/Sub and stored in BQ */
export interface OperationalEvent {
  event_id?: string;
  organization_id: string;
  user_id: string | null;
  event_type: EventTypeValue;
  event_category: EventCategoryType;
  platform: Platform;
  event_time: string; // ISO
  event_date?: string; // YYYY-MM-DD
  payload?: Record<string, unknown>;
  inserted_at?: string;
}
