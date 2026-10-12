"use client";

import { useEffect, useState } from "react";
import { track } from "@/components/analytics";

export default function SuccessPage() {
  const [label, setLabel] = useState("Checking payment…");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setLabel("Open the tracking link from your request to see the booking.");
      return;
    }
    fetch(`/api/health`).finally(async () => {
      const response = await fetch(`/track/${token}`, { headers: { accept: "text/html" } });
      const html = await response.text();
      const paid = html.includes("Booking confirmed") || html.includes("Payment: paid");
      setLabel(paid ? "Payment is verified and the booking is confirmed." : "If you paid, the tracking page will update once the payment provider confirms it.");
      if (paid && !sessionStorage.getItem(`paid:${token}`)) {
        sessionStorage.setItem(`paid:${token}`, "1");
        track("payment_completed");
        track("booking_accepted");
        const labelId = process.env.NEXT_PUBLIC_ADS_PAYMENT_LABEL;
        const win = window as Window & { gtag?: (...args: unknown[]) => void };
        if (labelId) win.gtag?.("event", "conversion", { send_to: labelId });
      }
      window.location.replace(`/track/${token}`);
    });
  }, []);

  return <div className="mx-auto max-w-xl px-4 py-16"><h1 className="font-display text-4xl">{label}</h1></div>;
}
