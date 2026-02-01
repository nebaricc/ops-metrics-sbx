export {
  EventCategory,
  EventType,
  EVENT_TYPE_TO_CATEGORY,
  type EventCategoryType,
  type EventTypeValue,
  type Platform,
  type ClientEventPayload,
  type OperationalEvent,
} from "./types";

export {
  setMetricsContext,
  getMetricsContext,
  track,
  pageView,
  appOpen,
  createInspection,
  createWorkOrder,
  updateWorkOrder,
  setMetricsDebugCallback,
  getLastSentEvent,
  getAppOpenSentEvent,
  getEventForPage,
  getAppOpenSentFromPage,
  setMetricsCurrentPage,
  type MetricsContext,
  type SentEventDebug,
} from "./client";
