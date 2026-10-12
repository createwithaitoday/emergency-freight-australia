"use client";

import { useEffect, useState } from "react";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export function track(name: string, params?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("efa-consent") !== "accepted") return;
  const win = window as AnalyticsWindow;
  win.gtag?.("event", name, params ?? {});
}

export function ConsentAndAnalytics({ gaId, adsId }: { gaId?: string; adsId?: string }) {
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    setChoice(window.localStorage.getItem("efa-consent"));
  }, []);

  useEffect(() => {
    if (choice !== "accepted" || !gaId) return;
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.async = true;
    document.head.appendChild(script);
    const win = window as AnalyticsWindow;
    win.dataLayer = win.dataLayer || [];
    win.gtag = function gtag(...args: unknown[]) {
      win.dataLayer?.push(args);
    };
    win.gtag("js", new Date());
    win.gtag("config", gaId);
    if (adsId) win.gtag("config", adsId);
  }, [choice, gaId, adsId]);

  if (choice) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-navy-950 p-4 text-white shadow-2xl md:bottom-6">
      <p className="text-sm leading-6 text-white/80">
        We use a necessary cookie to keep you signed in. Analytics and advertising tags stay off unless you allow them.
        Phone calls and calculator steps are not reported as sales.
      </p>
      <div className="mt-3 flex gap-2">
        <button className="btn-orange px-4 py-2" type="button" onClick={() => choose("accepted")}>
          Allow analytics
        </button>
        <button className="btn-ghost px-4 py-2" type="button" onClick={() => choose("rejected")}>
          Necessary only
        </button>
      </div>
    </div>
  );

  function choose(value: string) {
    window.localStorage.setItem("efa-consent", value);
    setChoice(value);
  }
}
