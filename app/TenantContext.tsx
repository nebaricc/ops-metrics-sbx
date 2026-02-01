"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "operational-metrics-demo-orgs";

export interface OrgUser {
  id: string;
  label: string;
}

export interface Organization {
  id: string;
  label: string;
  users: OrgUser[];
}

export interface Tenant {
  organizationId: string;
  userId: string;
  organizationLabel: string;
  userLabel: string;
}

const DEFAULT_ORGANIZATIONS: Organization[] = [
  {
    id: "demo-org-001",
    label: "Acme Corp",
    users: [
      { id: "demo-user-001", label: "Jordan Smith" },
      { id: "demo-user-002", label: "Sam Rivera" },
      { id: "demo-user-003", label: "Alex Chen" },
    ],
  },
  {
    id: "demo-org-002",
    label: "Beta Co",
    users: [
      { id: "demo-user-004", label: "Morgan Lee" },
      { id: "demo-user-005", label: "Casey Brown" },
    ],
  },
  {
    id: "demo-org-003",
    label: "Gamma Logistics",
    users: [
      { id: "demo-user-006", label: "Riley Davis" },
      { id: "demo-user-007", label: "Quinn Wilson" },
      { id: "demo-user-008", label: "Taylor Jones" },
    ],
  },
];

function loadOrganizations(): Organization[] {
  if (typeof window === "undefined") return JSON.parse(JSON.stringify(DEFAULT_ORGANIZATIONS));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_ORGANIZATIONS));
    const parsed = JSON.parse(raw) as Organization[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : JSON.parse(JSON.stringify(DEFAULT_ORGANIZATIONS));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_ORGANIZATIONS));
  }
}

const INITIAL_ORGS = JSON.parse(JSON.stringify(DEFAULT_ORGANIZATIONS));

function saveOrganizations(orgs: Organization[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orgs));
  } catch {
    // ignore
  }
}

function getTenant(
  orgId: string,
  userId: string,
  orgs: Organization[]
): Tenant | null {
  const org = orgs.find((o) => o.id === orgId);
  const user = org?.users.find((u) => u.id === userId);
  if (!org || !user) return null;
  return {
    organizationId: org.id,
    userId: user.id,
    organizationLabel: org.label,
    userLabel: user.label,
  };
}

interface TenantContextValue {
  tenant: Tenant;
  organizations: Organization[];
  usersForCurrentOrg: OrgUser[];
  setOrganization: (orgId: string) => void;
  setUser: (userId: string) => void;
  addOrganization: (label: string) => Organization;
  addUser: (organizationId: string, label: string) => OrgUser;
  resetToDefaults: () => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>(INITIAL_ORGS);

  useEffect(() => {
    setOrganizations(loadOrganizations());
  }, []);

  const firstOrg = organizations[0];
  const firstUser = firstOrg?.users[0];

  const [organizationId, setOrganizationId] = useState(INITIAL_ORGS[0]?.id ?? "");
  const [userId, setUserId] = useState(INITIAL_ORGS[0]?.users[0]?.id ?? "");

  useEffect(() => {
    if (organizations.length > 0 && !organizationId) {
      setOrganizationId(organizations[0].id);
      setUserId(organizations[0].users[0]?.id ?? "");
    }
  }, [organizations, organizationId]);

  const usersForCurrentOrg = useMemo(() => {
    const org = organizations.find((o) => o.id === organizationId);
    return org?.users ?? [];
  }, [organizations, organizationId]);

  useEffect(() => {
    if (organizations.length === 0) return;
    const org = organizations.find((o) => o.id === organizationId);
    if (!org) {
      setOrganizationId(organizations[0].id);
      setUserId(organizations[0].users[0]?.id ?? "");
      return;
    }
    const isInOrg = org.users.some((u) => u.id === userId);
    if (!isInOrg && org.users.length > 0) {
      setUserId(org.users[0].id);
    }
  }, [organizations, organizationId, userId]);

  const setOrganization = useCallback(
    (orgId: string) => {
      const org = organizations.find((o) => o.id === orgId);
      if (org) {
        setOrganizationId(org.id);
        setUserId(org.users[0]?.id ?? "");
      }
    },
    [organizations]
  );

  const setUser = useCallback((uid: string) => {
    setUserId(uid);
  }, []);

  const addOrganization = useCallback((label: string): Organization => {
    const id = `custom-org-${Date.now()}`;
    const userId = `custom-user-${Date.now()}`;
    const newOrg: Organization = {
      id,
      label: label.trim() || id,
      users: [{ id: userId, label: "User 1" }],
    };
    setOrganizations((prev) => {
      const next = [...prev, newOrg];
      saveOrganizations(next);
      return next;
    });
    setOrganizationId(newOrg.id);
    setUserId(newOrg.users[0].id);
    return newOrg;
  }, []);

  const addUser = useCallback((organizationId: string, label: string): OrgUser => {
    const id = `custom-user-${Date.now()}`;
    const newUser: OrgUser = { id, label: label.trim() || id };
    setOrganizations((prev) => {
      const next = prev.map((org) =>
        org.id === organizationId
          ? { ...org, users: [...org.users, newUser] }
          : org
      );
      saveOrganizations(next);
      return next;
    });
    setUserId(newUser.id);
    return newUser;
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_ORGANIZATIONS));
    setOrganizations(defaults);
    saveOrganizations(defaults);
    setOrganizationId(defaults[0].id);
    setUserId(defaults[0].users[0].id);
  }, []);

  const tenant = useMemo(
    () =>
      getTenant(organizationId, userId, organizations) ?? (firstOrg && firstUser
        ? {
            organizationId: firstOrg.id,
            userId: firstUser.id,
            organizationLabel: firstOrg.label,
            userLabel: firstUser.label,
          }
        : null),
    [organizationId, userId, organizations, firstOrg, firstUser]
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant: tenant!,
      organizations,
      usersForCurrentOrg,
      setOrganization,
      setUser,
      addOrganization,
      addUser,
      resetToDefaults,
    }),
    [
      tenant,
      organizations,
      usersForCurrentOrg,
      setOrganization,
      setUser,
      addOrganization,
      addUser,
      resetToDefaults,
    ]
  );

  if (!tenant) return null;

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
