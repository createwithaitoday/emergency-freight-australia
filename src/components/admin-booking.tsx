"use client";

import { useState } from "react";
import { BOOKING_STATUSES } from "@/lib/workflow";

export function AdminBookingForm({ bookingId }: { bookingId: string }) {
  const [message, setMessage] = useState("");

  async function send(action: string, fields: Record<string, string>) {
    const response = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, bookingId, ...fields }),
    });
    const body = await response.json();
    setMessage(response.ok ? "Saved." : body.error || "That action failed.");
    if (response.ok) window.location.reload();
  }

  return (
    <div className="grid gap-4 text-ink">
      <form className="rounded-2xl bg-white p-4" onSubmit={(event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries()); void send("price", data as Record<string, string>); }}>
        <h2 className="font-semibold">Approve selling price</h2>
        <p className="text-sm text-muted">Enter the ex-GST amount. GST is added from the rate card. Payment opens only after this.</p>
        <input className="field mt-2" name="netDollars" inputMode="decimal" required placeholder="Ex-GST dollars" aria-label="Selling price excluding GST" />
        <input className="field mt-2" name="overrideReason" placeholder="Override reason if below the minimum" aria-label="Override reason" />
        <button className="btn-navy mt-3" type="submit">Send price for payment</button>
      </form>
      <form className="rounded-2xl bg-white p-4" onSubmit={(event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries()); void send("status", { ...data, onAccount: data.onAccount ? "true" : "" } as Record<string, string>); }}>
        <h2 className="font-semibold">Update status</h2>
        <select className="field mt-2" name="to" aria-label="Next status">
          {BOOKING_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
        </select>
        <input className="field mt-2" name="driverName" placeholder="Driver name, when allocating" aria-label="Driver name" />
        <input className="field mt-2" name="driverPhone" placeholder="Driver phone" aria-label="Driver phone" />
        <input className="field mt-2" name="carrierName" placeholder="Carrier" aria-label="Carrier" />
        <input className="field mt-2" name="carrierCostDollars" placeholder="Carrier cost ex GST" aria-label="Carrier cost" />
        <input className="field mt-2" name="eta" placeholder="Customer estimate, if you have one" aria-label="Estimate" />
        <input className="field mt-2" name="recipientName" placeholder="Recipient, required to mark delivered" aria-label="Recipient" />
        <input className="field mt-2" name="note" placeholder="Internal note for this change" aria-label="Note" />
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="onAccount" /> Confirm on approved account terms</label>
        <button className="btn-navy mt-3" type="submit">Record status</button>
      </form>
      <form className="rounded-2xl bg-white p-4" onSubmit={(event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries()); void send("refund", data as Record<string, string>); }}>
        <h2 className="font-semibold">Refund</h2>
        <input className="field mt-2" name="amountDollars" placeholder="Refund dollars" aria-label="Refund amount" />
        <input className="field mt-2" name="reason" placeholder="Reason" aria-label="Refund reason" />
        <button className="btn-navy mt-3" type="submit">Record refund</button>
      </form>
      {message && <p className="text-sm text-white">{message}</p>}
    </div>
  );
}
