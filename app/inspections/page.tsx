"use client";

import { useState } from "react";
import Link from "next/link";
import { usePageView } from "../MetricsProvider";
import { createInspection } from "@/lib/events";

export default function InspectionsPage() {
  usePageView("inspections");
  const [created, setCreated] = useState(false);

  const handleCreateInspection = () => {
    createInspection({ inspection_id: `insp-${Date.now()}` });
    setCreated(true);
  };

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Checks</h1>
      <p className="text-slate-400 mb-4">Page view: checks (tracked).</p>
      <button
        onClick={handleCreateInspection}
        className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500"
      >
        Create check
      </button>
      {created && (
        <p className="mt-2 text-green-400 text-sm">Event sent: create_inspection</p>
      )}
      <div className="mt-4">
        <Link href="/" className="text-cyan-400 hover:underline">
          ← Home
        </Link>
      </div>
    </main>
  );
}
