import { SeoAdmin } from "@/components/seo-admin";
import { getDb } from "@/lib/db/client";
import { listCandidates, summarise } from "@/lib/seo/inventory";

export const dynamic = "force-dynamic";

export default async function SeoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const db = await getDb();
  const summary = await summarise(db.query.bind(db)).catch(() => null);
  const list = await listCandidates({
    q: params.q,
    status: params.status,
    state: params.state,
    family: params.family,
    service: params.service,
    industry: params.industry,
    sort: params.sort,
    page: Number(params.page || 1),
  }).catch(() => ({ rows: [], page: 1 }));
  return (
    <SeoAdmin
      summary={summary}
      rows={list.rows.map((row) => ({
        id: String(row.id),
        url: String(row.url),
        family: String(row.family),
        keyword: String(row.primary_keyword),
        state: row.state_code ? String(row.state_code) : "",
        score: Number(row.quality_score),
        status: String(row.status),
        demand: String(row.demand_label),
      }))}
      page={list.page}
      filters={{ q: params.q ?? "", status: params.status ?? "", state: params.state ?? "", family: params.family ?? "", service: params.service ?? "", industry: params.industry ?? "", sort: params.sort ?? "score" }}
    />
  );
}
