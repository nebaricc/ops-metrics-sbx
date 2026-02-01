"use client";

import { useState } from "react";
import Link from "next/link";
import { usePageView } from "../MetricsProvider";
import { createWorkOrder, updateWorkOrder } from "@/lib/events";

export default function WorkOrdersPage() {
  usePageView("work-orders");
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleCreate = () => {
    createWorkOrder({ work_order_id: `wo-${Date.now()}` });
    setLastAction("create_work_order");
  };

  const handleUpdate = () => {
    updateWorkOrder({ work_order_id: `wo-${Date.now()}` });
    setLastAction("update_work_order");
  };

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Tasks</h1>
      <p className="text-slate-400 mb-4">Page view: tasks (tracked).</p>
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500"
        >
          Create task
        </button>
        <button
          onClick={handleUpdate}
          className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500"
        >
          Update task
        </button>
      </div>
      {lastAction && (
        <p className="mt-2 text-green-400 text-sm">Event sent: {lastAction}</p>
      )}
      <div className="mt-4">
        <Link href="/" className="text-cyan-400 hover:underline">
          ← Home
        </Link>
      </div>
    </main>
  );
}
