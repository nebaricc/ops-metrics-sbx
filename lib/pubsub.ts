import { PubSub } from "@google-cloud/pubsub";
import {
  EVENT_TYPE_TO_CATEGORY,
  type EventTypeValue,
  type OperationalEvent,
  type Platform,
} from "./events/types";

let pubsub: PubSub | null = null;
let topicName: string | null = null;

function getTopicName(): string {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const name = process.env.PUBSUB_TOPIC_OPERATIONAL_EVENTS;
  if (name) return name;
  if (project) return `operational-events-dev`; // fallback for local
  return "";
}

/**
 * Publish a single operational event to Pub/Sub.
 * Message body is JSON: OperationalEvent.
 */
export async function publishEvent(event: OperationalEvent): Promise<string | null> {
  const name = topicName ?? getTopicName();
  if (!name) {
    console.warn("[operational-metrics] No Pub/Sub topic configured (GOOGLE_CLOUD_PROJECT or PUBSUB_TOPIC_OPERATIONAL_EVENTS)");
    return null;
  }

  if (!pubsub) {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    pubsub = new PubSub(project ? { projectId: project } : {});
  }

  const topic = pubsub.topic(name);
  const msg = Buffer.from(JSON.stringify(event), "utf8");
  const id = await topic.publishMessage({ data: msg });
  return id;
}

/**
 * Build an OperationalEvent from client payload and context.
 */
export function buildOperationalEvent(
  eventType: EventTypeValue,
  organizationId: string,
  userId: string | null,
  platform: Platform,
  payload?: Record<string, unknown>,
  timestamp?: string
): OperationalEvent {
  const eventTime = timestamp ?? new Date().toISOString();
  const eventDate = eventTime.slice(0, 10); // YYYY-MM-DD
  const event_category = EVENT_TYPE_TO_CATEGORY[eventType];

  return {
    organization_id: organizationId,
    user_id: userId,
    event_type: eventType,
    event_category,
    platform,
    event_time: eventTime,
    event_date: eventDate,
    payload: payload ?? undefined,
    inserted_at: new Date().toISOString(),
  };
}
