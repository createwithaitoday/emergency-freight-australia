"use client";

import { useState } from "react";

export function TrackActions({ token, canPay, canCancel, demo }: { token: string; canPay: boolean; canCancel: boolean; demo: boolean }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function pay() {
    setError("");
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = await response.json();
    if (body.url) window.location.href = body.url;
    else setError(body.error || "Card checkout is not available.");
  }

  async function demoPay() {
    setError("");
    const response = await fetch("/api/payments/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Demo payment failed.");
    else window.location.reload();
  }

  async function cancel() {
    const reason = window.prompt("Why are you cancelling? You can leave this blank.") ?? "";
    const response = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, reason }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Cancellation failed.");
    else window.location.reload();
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("token", token);
    const response = await fetch("/api/uploads", { method: "POST", body: data });
    const body = await response.json();
    setMessage(response.ok ? "Files received." : body.error || "Upload failed.");
  }

  return (
    <div className="mt-6 grid gap-3">
      {canPay && <button className="btn-navy" type="button" onClick={() => void pay()}>Pay the confirmed price</button>}
      {canPay && demo && <button className="rounded-xl border border-line px-4 py-3 text-sm" type="button" onClick={() => void demoPay()}>Simulate sandbox payment</button>}
      {canCancel && <button className="text-left text-sm underline" type="button" onClick={() => void cancel()}>Cancel this request</button>}
      <form onSubmit={upload} className="rounded-2xl border border-line p-4">
        <label className="text-sm font-semibold">
          Photos or documents
          <input className="mt-2 block w-full text-sm" type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,application/pdf" />
        </label>
        <button className="mt-3 rounded-xl border border-line px-3 py-2 text-sm font-semibold" type="submit">Upload</button>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
