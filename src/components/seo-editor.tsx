"use client";

import { useState } from "react";
import type { SeoDocument } from "@/lib/seo/quality";

type Score = { total?: number; publication?: string; mandatoryFailures?: string[]; intent?: number; unique?: number; geographic?: number; feasibility?: number; conversion?: number; local?: number; internalLinks?: number; technical?: number; schema?: number; duplication?: number };
type Similar = { id: string; url: string; keyword: string; score: number; status: string };

const LABELS: [keyof Score, string, number][] = [
  ["intent", "Search intent", 15],
  ["unique", "Unique content", 20],
  ["geographic", "Geography", 10],
  ["feasibility", "Service feasibility", 15],
  ["conversion", "Conversion", 10],
  ["local", "Local or route detail", 10],
  ["internalLinks", "Internal links", 5],
  ["technical", "Metadata", 5],
  ["schema", "Structured data", 5],
  ["duplication", "Duplicate risk", 5],
];

export function SeoEditor({ id, url, status, keyword, demand, doc, score, schema, similar }: {
  id: string;
  url: string;
  status: string;
  keyword: string;
  demand: string;
  doc: SeoDocument;
  score: Score;
  schema: { ok: boolean; issues: string[] };
  similar: Similar[];
}) {
  const [draft, setDraft] = useState(doc);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentScore, setCurrentScore] = useState(score);
  const [currentStatus, setCurrentStatus] = useState(status);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error || "Save failed.");
      return;
    }
    setMessage(payload.message || "Saved.");
    if (payload.saved?.score) setCurrentScore(payload.saved.score);
    if (payload.saved?.status) setCurrentStatus(payload.saved.status);
    if (body.action === "review") window.location.reload();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl">{draft.h1}</h1>
        <p className="mt-2 text-sm text-white/60">{keyword} · {demand} · {currentStatus} · score {currentScore.total ?? "—"}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">Title<input className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label className="grid gap-1 text-sm">H1<input className="field" value={draft.h1} onChange={(event) => setDraft({ ...draft, h1: event.target.value })} /></label>
      </div>
      <label className="grid gap-1 text-sm">Meta description<textarea className="field min-h-20" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <label className="grid gap-1 text-sm">Summary<textarea className="field min-h-24" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
      {draft.sections.map((section, index) => (
        <div key={index} className="grid gap-2 rounded-2xl border border-white/10 p-3">
          <input className="field" value={section.heading} aria-label={`Section ${index + 1} heading`} onChange={(event) => setDraft({ ...draft, sections: draft.sections.map((item, itemIndex) => itemIndex === index ? { ...item, heading: event.target.value } : item) })} />
          <textarea className="field min-h-24" value={section.body} aria-label={`Section ${index + 1} body`} onChange={(event) => setDraft({ ...draft, sections: draft.sections.map((item, itemIndex) => itemIndex === index ? { ...item, body: event.target.value } : item) })} />
        </div>
      ))}
      {draft.faqs.map((faq, index) => (
        <div key={index} className="grid gap-2 rounded-2xl border border-white/10 p-3">
          <input className="field" value={faq.q} aria-label={`Question ${index + 1}`} onChange={(event) => setDraft({ ...draft, faqs: draft.faqs.map((item, itemIndex) => itemIndex === index ? { ...item, q: event.target.value } : item) })} />
          <textarea className="field min-h-20" value={faq.a} aria-label={`Answer ${index + 1}`} onChange={(event) => setDraft({ ...draft, faqs: draft.faqs.map((item, itemIndex) => itemIndex === index ? { ...item, a: event.target.value } : item) })} />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn-orange" type="button" disabled={busy} onClick={() => void post({ action: "save", id, edit: { title: draft.title, description: draft.description, h1: draft.h1, summary: draft.summary, sections: draft.sections, faqs: draft.faqs } })}>Save and rescore</button>
        <button type="button" disabled={busy} onClick={() => void post({ action: "review", review: "approve", ids: [id] })}>Approve</button>
        <button type="button" disabled={busy} onClick={() => void post({ action: "review", review: "reject", ids: [id] })}>Reject</button>
        <button type="button" disabled={busy} onClick={() => void post({ action: "review", review: "noindex", ids: [id] })}>Noindex</button>
        <button type="button" disabled={busy} onClick={() => void post({ action: "review", review: "archive", ids: [id] })}>Archive</button>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
      <section className="grid gap-2 text-sm">
        <h2 className="font-display text-2xl">Quality breakdown</h2>
        <ul>
          {LABELS.map(([key, label, weight]) => <li key={key}>{label}: {currentScore[key] ?? "—"} / {weight}</li>)}
        </ul>
        {currentScore.mandatoryFailures?.length ? <p>Blocked: {currentScore.mandatoryFailures.join(". ")}</p> : <p>No mandatory failures recorded on the last score.</p>}
        <p>Publication recommendation: {currentScore.publication ?? "not scored"}</p>
      </section>
      <section className="grid gap-2 text-sm">
        <h2 className="font-display text-2xl">Canonical and links</h2>
        <p>Canonical path: {draft.canonicalPath}</p>
        <p>Structured data: {schema.ok ? "Service and breadcrumb markup match the visible page." : schema.issues.join(" ")}</p>
        <ul>{draft.links.map((link) => <li key={link.href}>{link.label} → {link.href}</li>)}</ul>
      </section>
      <section className="grid gap-2 text-sm">
        <h2 className="font-display text-2xl">Similar pages</h2>
        <ul>
          {similar.map((item) => <li key={item.id}><a className="underline" href={`/admin/seo/${item.id}`}>{item.keyword}</a> · {item.score} · {item.status} · {item.url}</li>)}
        </ul>
      </section>
      <section className="rounded-2xl border border-white/10 p-4">
        <h2 className="font-display text-2xl">Preview</h2>
        <article className="mt-4 max-w-3xl">
          <h1 className="font-display text-4xl">{draft.h1}</h1>
          <p className="mt-3 text-lg">{draft.summary}</p>
          {draft.sections.map((section) => (
            <section key={section.heading} className="mt-6">
              <h2 className="font-display text-2xl">{section.heading}</h2>
              <p className="mt-2 leading-7 text-white/80">{section.body}</p>
            </section>
          ))}
        </article>
      </section>
      {currentStatus === "published" ? <a className="text-sm underline" href={url}>Open published page</a> : <p className="text-sm text-white/60">This URL is not published: {url}</p>}
    </div>
  );
}
