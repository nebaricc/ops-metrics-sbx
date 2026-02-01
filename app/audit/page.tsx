"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTenant } from "../TenantContext";

interface AuditEvent {
  event_time: string;
  user_id: string | null;
  event_type: string;
  payload: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  app_open: "Logged in",
  page_view_dashboard: "Visited Dashboard",
  page_view_fleet: "Visited Assets",
  page_view_inspections: "Visited Checks",
  page_view_work_orders: "Visited Tasks",
  page_view_maintenance: "Visited Settings",
  page_view_jobs: "Visited Jobs",
  page_view_operator_dashboard: "Visited Field View",
  create_inspection: "Created check",
  create_work_order: "Created task",
  update_work_order: "Updated task",
};

function eventToLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AuditPage() {
  const { tenant, organizations } = useTenant();
  const org = organizations.find((o) => o.id === tenant.organizationId);
  const usersForOrg = org?.users ?? [];

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [filterEventType, setFilterEventType] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      organizationId: tenant.organizationId,
      from,
      to,
    });
    if (filterUserId) params.set("userId", filterUserId);
    if (filterEventType) params.set("eventType", filterEventType);
    fetch(`/api/reports/audit?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEvents(data.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant.organizationId, from, to, filterUserId, filterEventType]);

  const userLabel = (userId: string | null) => {
    if (!userId) return "—";
    const u = usersForOrg.find((x) => x.id === userId);
    return u ? u.label : userId;
  };

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Audit</h1>
      <p className="text-slate-400 mb-6">
        Who did what, by time. Switch org in the header to see that org’s audit.
        Filter by user and/or event type to narrow the list.
      </p>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <label className="text-slate-300 text-sm">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="ml-2 rounded bg-slate-800 text-slate-200 px-2 py-1 border border-slate-600"
          />
        </label>
        <label className="text-slate-300 text-sm">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="ml-2 rounded bg-slate-800 text-slate-200 px-2 py-1 border border-slate-600"
          />
        </label>
        <label className="text-slate-300 text-sm">
          User
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="ml-2 rounded bg-slate-800 text-slate-200 px-2 py-1 border border-slate-600 min-w-[140px]"
          >
            <option value="">All users</option>
            {usersForOrg.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} ({u.id})
              </option>
            ))}
          </select>
        </label>
        <label className="text-slate-300 text-sm">
          Event type
          <select
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="ml-2 rounded bg-slate-800 text-slate-200 px-2 py-1 border border-slate-600 min-w-[180px]"
          >
            <option value="">All event types</option>
            {Object.entries(EVENT_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-slate-500 text-sm mb-4">
        Viewing audit for: <strong className="text-slate-300">{tenant.organizationLabel}</strong> ({tenant.organizationId})
      </p>

      {loading && <p className="text-slate-500">Loading…</p>}

      {!loading && (
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-200 divide-y divide-slate-700">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-slate-500 text-center">
                    No events in this range.
                  </td>
                </tr>
              ) : (
                events.map((ev, i) => (
                  <tr key={`${ev.event_time}-${ev.user_id}-${i}`} className="bg-slate-900/50">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-400">
                      {formatTime(ev.event_time)}
                    </td>
                    <td className="px-4 py-2">{userLabel(ev.user_id)}</td>
                    <td className="px-4 py-2">{eventToLabel(ev.event_type)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <Link href="/" className="text-cyan-400 hover:underline">
          ← Home
        </Link>
      </div>
    </main>
  );
}
