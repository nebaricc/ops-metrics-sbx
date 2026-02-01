"use client";

import { useTenant } from "./TenantContext";

export function TenantSwitcher() {
  const {
    tenant,
    organizations,
    usersForCurrentOrg,
    setOrganization,
    setUser,
  } = useTenant();

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label
          htmlFor="org-select"
          className="text-slate-400 text-sm whitespace-nowrap"
        >
          Organization
        </label>
        <select
          id="org-select"
          value={tenant.organizationId}
          onChange={(e) => setOrganization(e.target.value)}
          className="rounded bg-slate-800 text-slate-200 px-3 py-1.5 border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 min-w-[140px]"
        >
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.label} ({org.id})
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label
          htmlFor="user-select"
          className="text-slate-400 text-sm whitespace-nowrap"
        >
          Acting as
        </label>
        <select
          id="user-select"
          value={tenant.userId}
          onChange={(e) => setUser(e.target.value)}
          className="rounded bg-slate-800 text-slate-200 px-3 py-1.5 border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 min-w-[160px]"
          title="Select which user is acting; events are sent with this user"
        >
          {usersForCurrentOrg.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label} ({u.id})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
