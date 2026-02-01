import { NextRequest, NextResponse } from "next/server";
import { getAuditEvents } from "@/lib/bigquery";

/** GET /api/reports/audit?organizationId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&userId=...&eventType=... */
export async function GET(request: NextRequest) {
  const organizationId =
    request.nextUrl.searchParams.get("organizationId") ??
    process.env.NEXT_PUBLIC_DEMO_ORG_ID ??
    "demo-org-001";
  const from =
    request.nextUrl.searchParams.get("from") ??
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to =
    request.nextUrl.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
  const eventType = request.nextUrl.searchParams.get("eventType") ?? undefined;

  try {
    const events = await getAuditEvents(organizationId, from, to, userId || undefined, eventType || undefined);
    return NextResponse.json({ organizationId, from, to, userId: userId || null, eventType: eventType || null, events });
  } catch (e) {
    console.error("[operational-metrics] GET /api/reports/audit error:", e);
    return NextResponse.json(
      { error: "Failed to load audit events" },
      { status: 500 }
    );
  }
}
