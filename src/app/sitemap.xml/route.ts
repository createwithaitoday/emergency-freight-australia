import { brand } from "@/lib/brand";
import { legalPages, locations, services } from "@/lib/content";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const FAMILIES = ["state", "local-service", "route", "industry", "industry-location"] as const;

export async function GET() {
  const base = brand.url.replace(/\/$/, "");
  if (base.includes("localhost") && process.env.NODE_ENV === "production") {
    return new Response("Sitemap host is not configured", { status: 500 });
  }
  const db = await getDb();
  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    `  <sitemap><loc>${base}/sitemaps/core.xml</loc></sitemap>`,
  ];
  for (const family of FAMILIES) {
    const rows = await db.query(
      `SELECT COUNT(*)::int AS count FROM seo_candidates WHERE status = 'published' AND indexable = TRUE AND family = $1`,
      [family],
    );
    const count = Number(rows[0]?.count ?? 0);
    const parts = Math.max(1, Math.ceil(count / 50000));
    if (count === 0) continue;
    for (let part = 0; part < parts; part += 1) {
      body.push(`  <sitemap><loc>${base}/sitemaps/${family}-${part}.xml</loc></sitemap>`);
    }
  }
  body.push(`</sitemapindex>`);
  return xml(body.join("\n"));
}

export function corePaths() {
  return ["", "/book", "/services", "/locations", "/pricing", "/faq", "/industries",
    ...services.map((service) => `/services/${service.slug}`),
    ...locations.map((location) => `/locations/${location.slug}`),
    ...legalPages.map((page) => `/legal/${page.slug}`),
  ];
}

function xml(body: string) {
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
