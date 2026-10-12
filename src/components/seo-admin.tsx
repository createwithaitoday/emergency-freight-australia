"use client";

import { useState } from "react";

type Row = { id: string; url: string; family: string; keyword: string; state: string; score: number; status: string; demand: string };

export function SeoAdmin({
  summary,
  rows,
  page,
  filters,
}: {
  summary: { candidates: number; published: number; awaitingReview: number; needsImprovement: number; duplicates: number; missingGeo: number; byStatus: Record<string, number> } | null;
  rows: Row[];
  page: number;
  filters: { q: string; status: string; state: string; family: string };
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [csv, setCsv] = useState("");

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: selected, csv, ...extra }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error || "The SEO action failed.");
      return;
    }
    setMessage(body.message || "Done.");
    if (action === "generate" || action === "review") window.location.reload();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-4xl">Search inventory</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/70">Candidate count is not indexed pages and it is not traffic. Template suburb pages stay unpublished. Automated publication of that long tail is off.</p>
      </div>
      {summary ? (
        <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Candidates", summary.candidates],
            ["Published", summary.published],
            ["Awaiting review", summary.awaitingReview],
            ["Need improvement", summary.needsImprovement],
            ["Duplicate flags", summary.duplicates],
            ["Missing geography", summary.missingGeo],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 p-3">
              <dt className="text-xs uppercase tracking-wide text-white/50">{label}</dt>
              <dd className="font-display text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
      ) : <p>The inventory has not been built yet.</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-orange" type="button" disabled={busy} onClick={() => void run("generate")}>{busy ? "Working…" : "Build or resume inventory"}</button>
      </div>
      <form className="grid gap-3 rounded-2xl border border-white/10 p-4 md:grid-cols-4" action="/admin/seo">
        <input className="field" name="q" placeholder="Keyword or URL" defaultValue={filters.q} />
        <input className="field" name="state" placeholder="State" defaultValue={filters.state} />
        <select className="field" name="status" defaultValue={filters.status}>
          <option value="">Any status</option>
          {["candidate", "needs_improvement", "awaiting_review", "published", "noindex", "archived"].map((status) => <option key={status}>{status}</option>)}
        </select>
        <select className="field" name="family" defaultValue={filters.family}>
          <option value="">Any family</option>
          {["state", "local-service", "route", "industry", "industry-location"].map((family) => <option key={family}>{family}</option>)}
        </select>
        <button className="rounded-xl border border-white/20 px-3 py-2 text-sm" type="submit">Filter</button>
      </form>
      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" disabled={busy} onClick={() => void run("review", { review: "approve" })}>Approve eligible</button>
        <button type="button" disabled={busy} onClick={() => void run("review", { review: "reject" })}>Reject selected</button>
        <button type="button" disabled={busy} onClick={() => void run("review", { review: "noindex" })}>Noindex selected</button>
        <button type="button" disabled={busy} onClick={() => void run("review", { review: "archive" })}>Archive selected</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50"><tr><th></th><th>Score</th><th>Status</th><th>Keyword</th><th>URL</th><th>Demand</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td><input type="checkbox" checked={selected.includes(row.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} /></td>
                <td>{row.score}</td>
                <td>{row.status}</td>
                <td>{row.keyword}</td>
                <td>{row.status === "published" ? <a className="underline" href={row.url}>{row.url}</a> : row.url}</td>
                <td>{row.demand}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-white/60">Page {page}. Forty rows at a time.</p>
      <label className="grid gap-2 text-sm">
        Keyword CSV: keyword,volume,competition,source
        <textarea className="field min-h-24" value={csv} onChange={(event) => setCsv(event.target.value)} />
      </label>
      <button type="button" className="w-fit rounded-xl border border-white/20 px-3 py-2 text-sm" disabled={busy} onClick={() => void run("keywords")}>Import keywords</button>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
