"use client";

import { useState, useRef, useEffect } from "react";
import { useTenant } from "./TenantContext";

export function AddOrgUser() {
  const { tenant, addOrganization, addUser, resetToDefaults } = useTenant();
  const [open, setOpen] = useState(false);
  const [orgLabel, setOrgLabel] = useState("");
  const [userLabel, setUserLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleAddOrg = (e: React.FormEvent) => {
    e.preventDefault();
    const label = orgLabel.trim();
    if (!label) {
      setMessage("Enter an organization name.");
      return;
    }
    addOrganization(label);
    setOrgLabel("");
    setMessage(`Added org "${label}". Switch to it in the Organization dropdown.`);
    setOpen(false);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const label = userLabel.trim();
    if (!label) {
      setMessage("Enter a user name.");
      return;
    }
    addUser(tenant.organizationId, label);
    setUserLabel("");
    setMessage(`Added user "${label}" to ${tenant.organizationLabel}.`);
    setOpen(false);
  };

  const handleReset = () => {
    if (typeof window !== "undefined" && window.confirm("Reset all orgs and users to defaults? This only affects this browser.")) {
      resetToDefaults();
      setMessage("Reset to defaults.");
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded bg-slate-700 text-slate-200 px-3 py-1.5 border border-slate-600 text-sm hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        Add…
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-lg bg-slate-800 border border-slate-600 shadow-xl p-4">
          <p className="text-slate-400 text-xs mb-3">
            Add orgs/users for testing. Stored in this browser only.
          </p>
          <form onSubmit={handleAddOrg} className="mb-4">
            <label className="block text-slate-400 text-xs mb-1">New organization</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={orgLabel}
                onChange={(e) => setOrgLabel(e.target.value)}
                placeholder="Org name"
                className="flex-1 rounded bg-slate-900 text-slate-200 px-2 py-1.5 border border-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                className="rounded bg-cyan-600 text-white px-2 py-1.5 text-sm hover:bg-cyan-500"
              >
                Create
              </button>
            </div>
          </form>
          <form onSubmit={handleAddUser} className="mb-4">
            <label className="block text-slate-400 text-xs mb-1">
              New user in <strong className="text-slate-300">{tenant.organizationLabel}</strong>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userLabel}
                onChange={(e) => setUserLabel(e.target.value)}
                placeholder="User name"
                className="flex-1 rounded bg-slate-900 text-slate-200 px-2 py-1.5 border border-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                className="rounded bg-cyan-600 text-white px-2 py-1.5 text-sm hover:bg-cyan-500"
              >
                Add
              </button>
            </div>
          </form>
          <button
            type="button"
            onClick={handleReset}
            className="text-slate-500 text-xs hover:text-slate-400 underline"
          >
            Reset to defaults
          </button>
          {message && (
            <p className="mt-3 text-cyan-400 text-xs">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
