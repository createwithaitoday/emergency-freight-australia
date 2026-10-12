import { listAudit } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const rows = await listAudit();
  return (
    <div>
      <h1 className="font-display text-3xl">Audit log</h1>
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        {rows.map((row) => (
          <li key={String(row.created_at) + String(row.action)}>
            {new Date(String(row.created_at)).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} · {String(row.actor_email)} · {String(row.action)} · {String(row.entity_id || "")} · {String(row.detail || "")}
          </li>
        ))}
      </ul>
    </div>
  );
}
