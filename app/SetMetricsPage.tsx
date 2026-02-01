"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setMetricsCurrentPage } from "@/lib/events";

/** Sets current pathname so the SDK can record events per page for the debug footer. */
export function SetMetricsPage() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) setMetricsCurrentPage(pathname);
  }, [pathname]);
  return null;
}
