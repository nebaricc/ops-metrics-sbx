"use client";

import { useEffect, useRef } from "react";
import {
  setMetricsContext,
  appOpen,
  pageView,
} from "@/lib/events";
import { useTenant } from "./TenantContext";

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const initialMount = useRef(true);

  useEffect(() => {
    setMetricsContext({
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      platform: "web",
    });
    if (initialMount.current) {
      initialMount.current = false;
      appOpen();
    } else {
      appOpen();
    }
  }, [tenant.organizationId, tenant.userId]);

  return <>{children}</>;
}

export function usePageView(pageName: string) {
  useEffect(() => {
    pageView(pageName);
  }, [pageName]);
}
