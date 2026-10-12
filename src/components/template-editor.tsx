"use client";

import { useState } from "react";

export function TemplateEditor({ template }: { template: { code: string; channel: string; subject: string; body: string } }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [message, setMessage] = useState("");

  async function save() {
    const response = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "template", code: template.code, channel: template.channel, subject, body }),
    });
    const payload = await response.json();
    setMessage(response.ok ? "Saved." : payload.error || "Save failed.");
  }

  return (
    <form className="rounded-2xl bg-white p-4 text-ink" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <p className="font-semibold">{template.code} · {template.channel}</p>
      <input className="field mt-2" value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Subject" />
      <textarea className="field mt-2" rows={4} value={body} onChange={(event) => setBody(event.target.value)} aria-label="Body" />
      <button className="btn-navy mt-3" type="submit">Save template</button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </form>
  );
}
