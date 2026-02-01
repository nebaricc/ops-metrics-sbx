"use client";

import Link from "next/link";
import { usePageView } from "../MetricsProvider";

export default function MaintenancePage() {
  usePageView("maintenance");
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Settings</h1>
      <p className="text-slate-400 mb-4">Page view: settings (tracked).</p>
      <Link href="/" className="text-cyan-400 hover:underline">
        ← Home
      </Link>
    </main>
  );
}
