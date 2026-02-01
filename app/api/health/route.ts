import { NextResponse } from "next/server";

/** GET /api/health — for Cloud Run and load balancer health checks */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
