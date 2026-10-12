import Link from "next/link";
import { notFound } from "next/navigation";
import { SeoEditor } from "@/components/seo-editor";
import { getCandidate } from "@/lib/seo/inventory";
import type { SeoDocument } from "@/lib/seo/quality";

export const dynamic = "force-dynamic";

export default async function SeoCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getCandidate(id);
  if (!found) notFound();
  const { row, doc, score, schema, similar } = found;
  return (
    <div className="grid gap-4">
      <Link href="/admin/seo" className="text-sm text-white/60">Back to inventory</Link>
      <SeoEditor
        id={String(row.id)}
        url={String(row.url)}
        status={String(row.status)}
        keyword={String(row.primary_keyword)}
        demand={String(row.demand_label)}
        doc={doc as SeoDocument}
        score={score}
        schema={schema}
        similar={similar.map((item) => ({
          id: String(item.id),
          url: String(item.url),
          keyword: String(item.primary_keyword),
          score: Number(item.quality_score),
          status: String(item.status),
        }))}
      />
    </div>
  );
}
