import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">
        Operational Metrics – Sample App
      </h1>
      <p className="text-slate-400 mb-6">
        This app demonstrates the operational metrics SDK and in-app reports for tenant admins.
        Use <strong className="text-slate-300">Organization</strong> and <strong className="text-slate-300">Acting as</strong> in the header to switch tenant and user; use <strong className="text-slate-300">Add…</strong> to create new orgs and users for testing (saved in this browser only). All events are sent with the selected org and user.
        Navigate to any page to trigger page-view events; use the action buttons to simulate
        task actions (e.g. create check, create/update task).
      </p>
      <p className="text-slate-500 text-sm mb-6">
        <strong className="text-slate-400">This page:</strong> If you landed here on first load, this is where <code className="text-slate-400">app_open</code> (login) is tracked — once per session. See the event debug footer below for this page’s status.
      </p>
      <nav className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="text-cyan-400 hover:underline"
        >
          Dashboard
        </Link>
        <Link href="/fleet" className="text-cyan-400 hover:underline">
          Assets
        </Link>
        <Link href="/inspections" className="text-cyan-400 hover:underline">
          Checks
        </Link>
        <Link href="/work-orders" className="text-cyan-400 hover:underline">
          Tasks
        </Link>
        <Link href="/maintenance" className="text-cyan-400 hover:underline">
          Settings
        </Link>
        <Link href="/jobs" className="text-cyan-400 hover:underline">
          Jobs
        </Link>
        <Link href="/operator-dashboard" className="text-cyan-400 hover:underline">
          Field View
        </Link>
        <Link
          href="/reports"
          className="mt-4 text-amber-400 hover:underline font-medium"
        >
          Tenant usage reports →
        </Link>
        <Link
          href="/audit"
          className="text-cyan-400 hover:underline"
        >
          Audit (who did what by time)
        </Link>
      </nav>
    </main>
  );
}
