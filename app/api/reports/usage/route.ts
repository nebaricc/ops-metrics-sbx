import { NextRequest, NextResponse } from "next/server";
import { getUsageReport } from "@/lib/bigquery";

/** GET /api/reports/usage?organizationId=...&from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(request: NextRequest) {
  const organizationId =
    request.nextUrl.searchParams.get("organizationId") ??
    process.env.NEXT_PUBLIC_DEMO_ORG_ID ??
    "demo-org-001";
  const from =
    request.nextUrl.searchParams.get("from") ??
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to =
    request.nextUrl.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  try {
    const report = await getUsageReport(organizationId, from, to);
    if (report === null) {
      return NextResponse.json({
        organizationId,
        from,
        to,
        uniqueUsers: 0,
        appOpens: 0,
        pageViews: [],
        createInspections: 0,
        createWorkOrders: 0,
        updateWorkOrders: 0,
        _note: "BigQuery not configured; returning empty report",
      });
    }
    return NextResponse.json(report);
  } catch (e) {
    console.error("[operational-metrics] GET /api/reports/usage error:", e);
    return NextResponse.json(
      { error: "Failed to load usage report" },
      { status: 500 }
    );
  }
}
