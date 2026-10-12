"use client";

import { useState } from "react";
import { track } from "@/components/analytics";

export function AccountForms({ mode }: { mode: "login" | "address" | "business" }) {
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const path = mode === "login" ? "/api/auth/magic-link" : mode === "address" ? "/api/account/addresses" : "/api/account/business";
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "That did not work.");
      return;
    }
    if (mode === "business") track("b2b_enquiry");
    setMessage(body.devLink ? `Development sign-in link: ${body.devLink}` : mode === "login" ? "Check your email for a sign-in link." : "Saved.");
    if (mode !== "login") window.location.reload();
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3">
      {mode === "login" && <input className="field" name="email" type="email" required placeholder="Work email" aria-label="Email" />}
      {mode === "address" && (
        <>
          <input className="field" name="label" placeholder="Label" aria-label="Label" />
          <input className="field" name="line1" required placeholder="Street address" aria-label="Street address" />
          <input className="field" name="suburb" placeholder="Suburb" aria-label="Suburb" />
          <input className="field" name="postcode" required placeholder="Postcode" aria-label="Postcode" />
          <input className="field" name="instructions" placeholder="Access notes" aria-label="Access notes" />
        </>
      )}
      {mode === "business" && (
        <>
          <input className="field" name="legalName" required placeholder="Legal entity name" aria-label="Legal entity name" />
          <input className="field" name="abn" placeholder="ABN, if you have one" aria-label="ABN" />
          <textarea className="field" name="notes" placeholder="Lanes, purchase orders, users who should have access" aria-label="Notes" />
        </>
      )}
      <button className="btn-navy" type="submit">{mode === "login" ? "Email me a sign-in link" : mode === "address" ? "Save address" : "Apply for a business account"}</button>
      {message && <p className="text-sm break-all">{message}</p>}
    </form>
  );
}
