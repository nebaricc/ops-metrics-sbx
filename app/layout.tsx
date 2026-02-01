import type { Metadata } from "next";
import "./globals.css";
import { TenantProvider } from "./TenantContext";
import { MetricsProvider } from "./MetricsProvider";
import { TenantSwitcher } from "./TenantSwitcher";
import { AddOrgUser } from "./AddOrgUser";
import { EventDebugFooter } from "./EventDebugFooter";
import { SetMetricsPage } from "./SetMetricsPage";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Operational Metrics – Sample App",
  description: "Sample app demonstrating operational metrics SDK and tenant usage reports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <TenantProvider>
          <MetricsProvider>
            <SetMetricsPage />
            <header className="border-b border-slate-700 bg-slate-900/50 sticky top-0 z-10">
              <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                <Link href="/" className="text-slate-200 font-medium hover:text-cyan-400">
                  Operational Metrics
                </Link>
                <div className="flex items-center gap-6">
                  <TenantSwitcher />
                  <AddOrgUser />
                  <nav className="flex gap-3 text-sm">
                    <Link href="/dashboard" className="text-slate-400 hover:text-slate-200">
                      Dashboard
                    </Link>
                    <Link href="/reports" className="text-slate-400 hover:text-slate-200">
                      Reports
                    </Link>
                    <Link href="/audit" className="text-slate-400 hover:text-slate-200">
                      Audit
                    </Link>
                  </nav>
                </div>
              </div>
            </header>
            {children}
            <EventDebugFooter />
          </MetricsProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
