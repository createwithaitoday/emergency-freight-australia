import { brand } from "@/lib/brand";
import { corePaths } from "@/app/sitemap.xml/route";
import { publishedSitemap } from "@/lib/seo/inventory";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const base = brand.url.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production" && base.includes("localhost")) {
    return new Response("Sitemap host is not configured", { status: 500 });
  }
  const file = id.replace(/\.xml$/, "");
  if (file === "core") {
    return xml(base, corePaths().map((path) => ({ url: path || "/", lastmod: null })));
  }
  const match = file.match(/^(state|local-service|route|industry|industry-location)-(\d+)$/);
  if (!match) return new Response("Unknown sitemap", { status: 404 });
  const offset = Number(match[2]) * 50000;
  const rows = await publishedSitemap(match[1], offset, 50000);
  return xml(base, rows.map((row) => ({ url: String(row.url), lastmod: row.content_changed_at ? String(row.content_changed_at) : null })));
}

function xml(base: string, rows: { url: string; lastmod: string | null }[]) {
  const urls = rows.map((row) => {
    const loc = `${base}${row.url === "/" ? "/" : row.url}`;
    const lastmod = row.lastmod ? `<lastmod>${new Date(row.lastmod).toISOString()}</lastmod>` : "";
    return `<url><loc>${escapeXml(loc)}</loc>${lastmod}</url>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
