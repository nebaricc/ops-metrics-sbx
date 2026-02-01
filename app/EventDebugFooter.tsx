"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getEventForPage,
  getAppOpenSentEvent,
  getAppOpenSentFromPage,
  setMetricsDebugCallback,
  type SentEventDebug,
} from "@/lib/events";

function DataBlock({ label, data }: { label: string; data: Record<string, unknown> }) {
  return (
    <div className="mt-1">
      <span className="text-slate-500 text-xs">{label}: </span>
      <code className="text-slate-300 text-xs break-all">
        {JSON.stringify(data)}
      </code>
    </div>
  );
}

export function EventDebugFooter() {
  const pathname = usePathname();
  const [, setVersion] = useState(0);

  useEffect(() => {
    setMetricsDebugCallback(() => setVersion((v) => v + 1));
    return () => setMetricsDebugCallback(null);
  }, []);

  const thisPageEvent = pathname ? getEventForPage(pathname) : null;
  const appOpenEvent = getAppOpenSentEvent();
  const appOpenSentFromPage = getAppOpenSentFromPage();
  const isAppOpenPage = pathname && pathname === appOpenSentFromPage;

  return (
    <footer className="mt-12 pt-6 border-t border-slate-700 max-w-4xl mx-auto px-6 pb-8">
      <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-3">
        Event debug (event for this page)
      </h3>
      <div className="rounded bg-slate-900 border border-slate-700 p-4 text-sm space-y-4">
        {isAppOpenPage && appOpenEvent ? (
          <>
            <p className="text-slate-400">
              <strong className="text-slate-300">This page:</strong> Tracks{" "}
              <code className="text-cyan-400">app_open</code> (login). Data not sent on this
              request — only once per session (when the app loaded or tenant changed).
            </p>
            <p className="text-slate-400 text-xs">
              Last data sent was at{" "}
              {new Date(appOpenEvent.timestamp).toLocaleTimeString()}:
            </p>
            <DataBlock
              label="Data sent (headers + body)"
              data={{
                eventType: appOpenEvent.eventType,
                organizationId: appOpenEvent.context.organizationId,
                userId: appOpenEvent.context.userId,
                platform: appOpenEvent.context.platform,
                timestamp: appOpenEvent.timestamp,
              }}
            />
          </>
        ) : thisPageEvent ? (
          <>
            <p className="text-slate-400">
              <strong className="text-slate-300">This page:</strong> Sends{" "}
              <code className="text-cyan-400">{thisPageEvent.callName}</code> at{" "}
              {new Date(thisPageEvent.timestamp).toLocaleTimeString()}.
            </p>
            <DataBlock
              label="Data sent (headers + body)"
              data={{
                eventType: thisPageEvent.eventType,
                organizationId: thisPageEvent.context.organizationId,
                userId: thisPageEvent.context.userId,
                platform: thisPageEvent.context.platform,
                payload: thisPageEvent.payload,
                timestamp: thisPageEvent.timestamp,
              }}
            />
          </>
        ) : (
          <p className="text-slate-400">
            <strong className="text-slate-300">This page:</strong>{" "}
            <span className="text-slate-500">Does not send an event.</span>
          </p>
        )}
      </div>
    </footer>
  );
}
