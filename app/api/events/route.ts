import { NextRequest, NextResponse } from "next/server";
import {
  EVENT_TYPE_TO_CATEGORY,
  type EventTypeValue,
  type Platform,
} from "@/lib/events/types";
import { buildOperationalEvent, publishEvent } from "@/lib/pubsub";
import { insertEvent } from "@/lib/bigquery";

/** POST /api/events – ingest one or more events (enrich + Pub/Sub or BQ) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events: Array<{ eventType: string; payload?: Record<string, unknown>; timestamp?: string }> =
      Array.isArray(body.events) ? body.events : [body];

    const organizationId =
      request.headers.get("x-organization-id") ??
      process.env.NEXT_PUBLIC_DEMO_ORG_ID ??
      "demo-org-001";
    const userId =
      request.headers.get("x-user-id") ?? process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "demo-user-001";
    const platform: Platform =
      (request.headers.get("x-platform") as Platform) ?? "web";

    const results: Array<{ eventType: string; ok: boolean; id?: string }> = [];

    for (const ev of events) {
      const eventType = ev.eventType as EventTypeValue;
      if (!eventType || !(eventType in EVENT_TYPE_TO_CATEGORY)) {
        results.push({ eventType: ev.eventType ?? "unknown", ok: false });
        continue;
      }

      const event = buildOperationalEvent(
        eventType,
        organizationId,
        userId,
        platform,
        ev.payload,
        ev.timestamp
      );

      const pubId = await publishEvent(event);
      if (pubId) {
        results.push({ eventType, ok: true, id: pubId });
        // Dual-write to BQ when project is set so reports work without a subscriber (e.g. dev/sbx)
        if (process.env.GOOGLE_CLOUD_PROJECT) {
          try {
            await insertEvent(event);
          } catch (e) {
            console.warn("[operational-metrics] dual-write to BQ failed:", e);
          }
        }
      } else {
        try {
          await insertEvent(event);
          results.push({ eventType, ok: true });
        } catch (e) {
          console.warn("[operational-metrics] insertEvent fallback failed:", e);
          results.push({ eventType, ok: false });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error("[operational-metrics] POST /api/events error:", e);
    return NextResponse.json(
      { error: "Failed to ingest events" },
      { status: 500 }
    );
  }
}
