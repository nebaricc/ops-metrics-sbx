"use client";

import { useEffect, useState } from "react";
import { useTenant } from "../TenantContext";

interface UsageReport {
  organizationId: string;
  from: string;
  to: string;
  uniqueUsers: number;
  appOpens: number;
  pageViews: { eventType: string; count: number }[];
  createInspections: number;
  createWorkOrders: number;
  updateWorkOrders: number;
  _note?: string;
}

export default function ReportsPage() {
  const { tenant } = useTenant();
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/reports/usage?organizationId=${encodeURIComponent(tenant.organizationId)}&from=${from}&to=${to}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        if (!cancelled) setReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant.organizationId, from, to]);

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">
        Tenant usage reports
      </h1>
      <p className="text-slate-400 mb-6">
        In-app view for SaaS tenant admins: usage for their org (logins, page
        views, task actions). Showing: <strong className="text-slate-200">{tenant.organizationLabel}</strong> – {tenant.userLabel} ({tenant.organizationId}).
      </p>

      <p className="text-slate-500 text-xs mb-2">
        Date range includes when you performed actions (default: last 30 days to today).
      </p>
      <div className="flex gap-4 mb-6 items-center">
        <label className="text-slate-300">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="ml-2 rounded bg-slate-800 text-slate-200 px-2 py-1 border border-slate-600"
          />
        </label>
        <label className="text-slate-300">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="ml-2 rounded bg-slate-800 text-slate-200 px-2 py-1 border border-slate-600"
          />
        </label>
      </div>

      {loading && (
        <p className="text-slate-500">Loading report…</p>
      )}

      {!loading && report && (
        <div className="space-y-6">
          {report._note && (
            <p className="text-amber-500 text-sm">{report._note}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
              <div className="text-slate-400 text-sm">App opens (logins)</div>
              <div className="text-xl font-semibold text-slate-100">
                {report.appOpens}
              </div>
            </div>
            <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
              <div className="text-slate-400 text-sm">Unique users</div>
              <div className="text-xl font-semibold text-slate-100">
                {report.uniqueUsers}
              </div>
            </div>
            <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
              <div className="text-slate-400 text-sm">Checks created</div>
              <div className="text-xl font-semibold text-slate-100">
                {report.createInspections}
              </div>
            </div>
            <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
              <div className="text-slate-400 text-sm">Tasks created</div>
              <div className="text-xl font-semibold text-slate-100">
                {report.createWorkOrders}
              </div>
            </div>
            <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
              <div className="text-slate-400 text-sm">Tasks updated</div>
              <div className="text-xl font-semibold text-slate-100">
                {report.updateWorkOrders}
              </div>
            </div>
          </div>
          {report.pageViews && report.pageViews.length > 0 && (
            <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-2">Page views by type</div>
              <ul className="space-y-1">
                {report.pageViews.map((pv) => (
                  <li key={pv.eventType} className="flex justify-between text-slate-200">
                    <span>{pv.eventType}</span>
                    <span>{pv.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <a href="/" className="text-cyan-400 hover:underline">
          ← Home
        </a>
      </div>
    </main>
  );
}
