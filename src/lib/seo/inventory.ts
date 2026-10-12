import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getDb, type Sql } from "@/lib/db/client";
import { newId } from "@/lib/ids";
import { HUBS, INDUSTRIES, LOCAL_SERVICES, ROUTES, STATE_NAMES } from "@/lib/seo/catalog";
import { findPlace, industryDocument, routeDocument, serviceDocument, stateDocument, type GeoPlace } from "@/lib/seo/compose";
import { scoreDocument, statusForScore, validateStructuredData, type SeoDocument } from "@/lib/seo/quality";

const SOURCE = "Australia Post delivery localities with ABS LGA fields, Matthew Proctor australian_postcodes compilation";
const VERSION = "extract-2026-10-13";

export function loadPlaces(): GeoPlace[] {
  const file = path.join(process.cwd(), "data", "geo", "locations.json");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { locations: GeoPlace[] };
  return parsed.locations;
}

export function plannedCandidateCount(originCount: number) {
  return originCount * LOCAL_SERVICES.length + ROUTES.length + INDUSTRIES.length + INDUSTRIES.length * HUBS.length + Object.keys(STATE_NAMES).filter((state) => ["NSW", "QLD", "VIC"].includes(state)).length;
}

type Row = {
  url: string;
  family: string;
  keyword: string;
  secondary: string[];
  intent: string;
  originKey: string | null;
  destinationKey: string | null;
  serviceSlug: string | null;
  industrySlug: string | null;
  stateCode: string | null;
  doc: SeoDocument;
};

export async function ensureSeoInventory(actor = "system") {
  const db = await getDb();
  const places = loadPlaces();
  const locationCount = await syncLocations(db.query.bind(db), places);
  const existing = await db.query(`SELECT COUNT(*)::int AS count FROM seo_candidates`);
  const already = Number(existing[0]?.count ?? 0);
  if (already >= 100000) {
    const summary = await summarise(db.query.bind(db));
    return { locationCount, created: 0, ...summary };
  }
  const seen = new Set<string>();
  const known = await db.query(`SELECT url FROM seo_candidates`);
  for (const row of known) seen.add(String(row.url));
  let created = 0;
  const buffer: Row[] = [];
  const flush = async () => {
    if (!buffer.length) return;
    created += await insertRows(db.query.bind(db), buffer, actor);
    buffer.length = 0;
  };
  const push = async (row: Row) => {
    if (seen.has(row.url)) return;
    seen.add(row.url);
    buffer.push(row);
    if (buffer.length >= 200) await flush();
  };

  for (const state of ["NSW", "QLD", "VIC"]) {
    const doc = stateDocument(state);
    await push(pack(doc, { family: "state", keyword: doc.h1, intent: "State origin coverage", stateCode: state }));
  }
  for (const place of places) {
    if (!place.origin) continue;
    for (const service of LOCAL_SERVICES) {
      const doc = serviceDocument(place, service);
      await push(pack(doc, {
        family: "local-service",
        keyword: `${service.keyword} ${place.name}`,
        secondary: [service.name, place.postcode, place.lga].filter(Boolean),
        intent: service.intent,
        originKey: `${place.state}|${place.slug}|${place.postcode}`,
        serviceSlug: service.slug,
        stateCode: place.state,
      }));
    }
  }
  for (const route of ROUTES) {
    const origin = findPlace(places, route.origin);
    const destination = findPlace(places, route.destination);
    if (!origin || !destination) continue;
    const doc = routeDocument(route, origin, destination);
    await push(pack(doc, {
      family: "route",
      keyword: `${origin.name} to ${destination.name} urgent freight`,
      intent: "Interstate or regional route",
      originKey: `${origin.state}|${origin.slug}|${origin.postcode}`,
      destinationKey: `${destination.state}|${destination.slug}|${destination.postcode}`,
      stateCode: origin.state,
    }));
  }
  for (const industry of INDUSTRIES) {
    const doc = industryDocument(industry);
    await push(pack(doc, { family: "industry", keyword: `${industry.name} urgent freight`, intent: "Industry freight request", industrySlug: industry.slug }));
    for (const hub of HUBS) {
      const place = findPlace(places, hub);
      if (!place) continue;
      const local = industryDocument(industry, hub, place);
      await push(docFrom(local, {
        family: "industry-location",
        keyword: `${industry.name} freight ${place.name}`,
        intent: "Industry and location",
        industrySlug: industry.slug,
        originKey: `${place.state}|${place.slug}|${place.postcode}`,
        stateCode: place.state,
      }));
    }
  }
  await flush();
  const summary = await summarise(db.query.bind(db));
  return { locationCount, created, ...summary };
}

function pack(doc: SeoDocument, meta: {
  family: string;
  keyword: string;
  intent: string;
  secondary?: string[];
  originKey?: string | null;
  destinationKey?: string | null;
  serviceSlug?: string | null;
  industrySlug?: string | null;
  stateCode?: string | null;
}): Row {
  return {
    url: doc.canonicalPath,
    family: meta.family,
    keyword: meta.keyword,
    secondary: meta.secondary ?? [],
    intent: meta.intent,
    originKey: meta.originKey ?? null,
    destinationKey: meta.destinationKey ?? null,
    serviceSlug: meta.serviceSlug ?? null,
    industrySlug: meta.industrySlug ?? null,
    stateCode: meta.stateCode ?? null,
    doc,
  };
}

function docFrom(doc: SeoDocument, meta: Parameters<typeof pack>[1]) {
  return pack(doc, meta);
}

async function syncLocations(query: Sql, places: GeoPlace[]) {
  const count = await query(`SELECT COUNT(*)::int AS count FROM geo_locations`);
  if (Number(count[0]?.count ?? 0) >= places.length) return Number(count[0]?.count ?? 0);
  for (let i = 0; i < places.length; i += 300) {
    const slice = places.slice(i, i + 300);
    const values: unknown[] = [];
    const tuples = slice.map((place, index) => {
      const base = index * 15;
      values.push(place.sourceId, "locality", place.name, place.slug, place.state, place.postcode, place.lga || null, place.lgaCode || null, place.lat, place.lng, place.sa2 || null, place.origin, SOURCE, place.sourceId, VERSION);
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13},$${base + 14},$${base + 15})`;
    });
    await query(
      `INSERT INTO geo_locations (id, kind, name, slug, state_code, postcode, lga_name, lga_code, lat, lng, sa2_name, origin_supported, source, source_id, data_version)
       VALUES ${tuples.join(",")}
       ON CONFLICT (id) DO NOTHING`,
      values,
    );
  }
  const after = await query(`SELECT COUNT(*)::int AS count FROM geo_locations`);
  return Number(after[0]?.count ?? 0);
}

async function insertRows(query: Sql, rows: Row[], actor: string) {
  const values: unknown[] = [];
  const tuples: string[] = [];
  rows.forEach((row, index) => {
    const score = scoreDocument(row.doc, false);
    const status = statusForScore(score, false, row.doc.enriched);
    const base = index * 21;
    const id = createHash("sha1").update(row.url).digest("hex").slice(0, 24);
    values.push(
      id, row.url, row.family, row.keyword, JSON.stringify(row.secondary), row.intent, row.originKey, row.destinationKey,
      row.serviceSlug, row.industrySlug, row.stateCode, "Demand not yet verified", score.geographic > 0, score.feasibility > 0,
      JSON.stringify(row.doc), score.unique, score.total, JSON.stringify(score), status === "published", status,
      status === "published" ? actor : null,
    );
    tuples.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13},$${base + 14},$${base + 15},$${base + 16},$${base + 17},$${base + 18},$${base + 19},$${base + 20},CASE WHEN $${base + 20} = 'published' THEN NOW() ELSE NULL END,CASE WHEN $${base + 20} = 'published' THEN NOW() ELSE NULL END,$${base + 21})`);
  });
  const inserted = await query(
    `INSERT INTO seo_candidates (
      id, url, family, primary_keyword, secondary_keywords, search_intent, origin_key, destination_key, service_slug, industry_slug, state_code,
      demand_label, geographic_valid, service_feasible, content_json, uniqueness_score, quality_score, quality_json, indexable, status, published_at, content_changed_at, reviewed_by
    ) VALUES ${tuples.join(",")}
    ON CONFLICT (url) DO NOTHING
    RETURNING id`,
    values,
  );
  const insertedIds = new Set(inserted.map((row) => String(row.id)));
  for (const row of rows) {
    const id = createHash("sha1").update(row.url).digest("hex").slice(0, 24);
    if (!insertedIds.has(id)) continue;
    if (statusForScore(scoreDocument(row.doc, false), false, row.doc.enriched) !== "published") continue;
    await query(
      `INSERT INTO seo_reviews (id, candidate_id, action, actor, note) VALUES ($1,$2,'published',$3,$4)`,
      [newId(), id, actor, "Reviewed catalogue page. Automated publication of template suburb pages is off."],
    );
  }
  return inserted.length;
}

export async function summarise(query: Sql) {
  const rows = await query(
    `SELECT status, COUNT(*)::int AS count FROM seo_candidates GROUP BY status`,
  );
  const byStatus: Record<string, number> = {};
  for (const row of rows) byStatus[String(row.status)] = Number(row.count);
  const duplicates = await query(`SELECT COUNT(*)::int AS count FROM seo_candidates WHERE duplicate_of IS NOT NULL`);
  const missingGeo = await query(`SELECT COUNT(*)::int AS count FROM seo_candidates WHERE geographic_valid = FALSE`);
  const published = byStatus.published ?? 0;
  const bands = await query(
    `SELECT
       SUM(CASE WHEN quality_score >= 85 THEN 1 ELSE 0 END)::int AS high,
       SUM(CASE WHEN quality_score >= 70 AND quality_score < 85 THEN 1 ELSE 0 END)::int AS mid,
       SUM(CASE WHEN quality_score < 70 THEN 1 ELSE 0 END)::int AS low
     FROM seo_candidates`,
  );
  return {
    byStatus,
    published,
    scoreBands: {
      high: Number(bands[0]?.high ?? 0),
      mid: Number(bands[0]?.mid ?? 0),
      low: Number(bands[0]?.low ?? 0),
    },
    awaitingReview: byStatus.awaiting_review ?? 0,
    needsImprovement: byStatus.needs_improvement ?? 0,
    candidates: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
    duplicates: Number(duplicates[0]?.count ?? 0),
    missingGeo: Number(missingGeo[0]?.count ?? 0),
    rejected: (byStatus.archived ?? 0) + (byStatus.consolidated ?? 0),
  };
}

export async function listCandidates(filters: { q?: string; status?: string; state?: string; family?: string; service?: string; industry?: string; sort?: string; page?: number }) {
  const db = await getDb();
  const page = Math.max(1, filters.page ?? 1);
  const where: string[] = ["TRUE"];
  const params: unknown[] = [];
  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(`(primary_keyword ILIKE $${params.length} OR url ILIKE $${params.length})`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }
  if (filters.state) {
    params.push(filters.state);
    where.push(`state_code = $${params.length}`);
  }
  if (filters.family) {
    params.push(filters.family);
    where.push(`family = $${params.length}`);
  }
  if (filters.service) {
    params.push(filters.service);
    where.push(`service_slug = $${params.length}`);
  }
  if (filters.industry) {
    params.push(filters.industry);
    where.push(`industry_slug = $${params.length}`);
  }
  params.push(40);
  params.push((page - 1) * 40);
  const order = filters.sort === "demand"
    ? "CASE WHEN search_volume IS NULL THEN 1 ELSE 0 END, search_volume DESC, quality_score DESC, url"
    : "quality_score DESC, url";
  const rows = await db.query(
    `SELECT id, url, family, primary_keyword, state_code, quality_score, status, demand_label, indexable, service_slug, industry_slug
     FROM seo_candidates WHERE ${where.join(" AND ")}
     ORDER BY ${order}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, page };
}

export async function getPublished(urlPath: string) {
  const db = await getDb();
  const rows = await db.query(
    `SELECT url, content_json, quality_score, status, content_changed_at, primary_keyword FROM seo_candidates WHERE url = $1 AND status = 'published' AND indexable = TRUE`,
    [urlPath],
  );
  if (!rows[0]) return null;
  return {
    url: String(rows[0].url),
    doc: JSON.parse(String(rows[0].content_json)) as SeoDocument,
    score: Number(rows[0].quality_score),
    updated: rows[0].content_changed_at ? String(rows[0].content_changed_at) : null,
    keyword: String(rows[0].primary_keyword),
  };
}

export async function publishedSitemap(family: string, offset: number, limit: number) {
  const db = await getDb();
  return db.query(
    `SELECT url, content_changed_at FROM seo_candidates
     WHERE status = 'published' AND indexable = TRUE AND family = $1
     ORDER BY url LIMIT $2 OFFSET $3`,
    [family, limit, offset],
  );
}

export async function importKeywords(actor: string, csv: string) {
  const db = await getDb();
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let imported = 0;
  for (const line of lines.slice(lines[0]?.toLowerCase().includes("keyword") ? 1 : 0)) {
    const [phrase, volume, competition, source] = line.split(",").map((part) => part.trim());
    if (!phrase) continue;
    const volumeNumber = volume && /^\d+$/.test(volume) ? Number(volume) : null;
    await db.query(
      `INSERT INTO seo_keywords (id, phrase, monthly_volume, competition_metric, competition_type, source, last_checked)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (phrase, country, source) DO UPDATE SET monthly_volume = EXCLUDED.monthly_volume, competition_metric = EXCLUDED.competition_metric, last_checked = EXCLUDED.last_checked`,
      [newId(), phrase, volumeNumber, competition || null, "imported", source || "manual-csv", new Date().toISOString().slice(0, 10)],
    );
    if (volumeNumber != null) {
      await db.query(
        `UPDATE seo_candidates SET search_volume = $2, volume_source = $3, demand_label = $4 WHERE lower(primary_keyword) = lower($1)`,
        [phrase, volumeNumber, source || "manual-csv", `${volumeNumber} monthly searches (${source || "manual-csv"})`],
      );
    }
    imported += 1;
  }
  await db.query(
    `INSERT INTO seo_reviews (id, candidate_id, action, actor, note) VALUES ($1,'keywords','import',$2,$3)`,
    [newId(), actor, `Imported ${imported} keyword rows. Missing volumes stay unverified.`],
  );
  return imported;
}

export async function reviewCandidates(actor: string, ids: string[], action: "approve" | "reject" | "noindex" | "archive") {
  const db = await getDb();
  let changed = 0;
  for (const id of ids.slice(0, 100)) {
    const rows = await db.query(`SELECT quality_json, status FROM seo_candidates WHERE id = $1`, [id]);
    const row = rows[0];
    if (!row) continue;
    const score = JSON.parse(String(row.quality_json)) as { publication?: string; mandatoryFailures?: string[] };
    if (action === "approve") {
      if (score.publication !== "eligible" || (score.mandatoryFailures?.length ?? 0) > 0) continue;
      await db.query(
        `UPDATE seo_candidates SET status = 'published', indexable = TRUE, published_at = COALESCE(published_at, NOW()), reviewed_at = NOW(), reviewed_by = $2, content_changed_at = NOW() WHERE id = $1`,
        [id, actor],
      );
    } else if (action === "reject") {
      await db.query(`UPDATE seo_candidates SET status = 'needs_improvement', indexable = FALSE, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $1`, [id, actor]);
    } else if (action === "noindex") {
      await db.query(`UPDATE seo_candidates SET status = 'noindex', indexable = FALSE, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $1`, [id, actor]);
    } else {
      await db.query(`UPDATE seo_candidates SET status = 'archived', indexable = FALSE, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $1`, [id, actor]);
    }
    await db.query(`INSERT INTO seo_reviews (id, candidate_id, action, actor) VALUES ($1,$2,$3,$4)`, [newId(), id, action, actor]);
    changed += 1;
  }
  return changed;
}

export type CandidateEdit = {
  title: string;
  description: string;
  h1: string;
  summary: string;
  sections: { heading: string; body: string }[];
  faqs: { q: string; a: string }[];
};

export async function getCandidate(id: string) {
  const db = await getDb();
  const rows = await db.query(`SELECT * FROM seo_candidates WHERE id = $1`, [id]);
  const row = rows[0];
  if (!row) return null;
  const doc = JSON.parse(String(row.content_json)) as SeoDocument;
  const similar = await db.query(
    `SELECT id, url, primary_keyword, quality_score, status FROM seo_candidates
     WHERE id <> $1 AND family = $2 ORDER BY quality_score DESC LIMIT 5`,
    [id, row.family],
  );
  return { row, doc, score: JSON.parse(String(row.quality_json || "{}")), schema: validateStructuredData(doc), similar };
}

export async function saveCandidate(actor: string, id: string, edit: CandidateEdit) {
  const db = await getDb();
  const rows = await db.query(`SELECT * FROM seo_candidates WHERE id = $1`, [id]);
  const row = rows[0];
  if (!row) throw new Error("Page not found.");
  const doc = JSON.parse(String(row.content_json)) as SeoDocument;
  doc.title = edit.title.trim().slice(0, 70);
  doc.description = edit.description.trim().slice(0, 170);
  doc.h1 = edit.h1.trim().slice(0, 120);
  doc.summary = edit.summary.trim().slice(0, 800);
  doc.sections = edit.sections.slice(0, 8).map((section) => ({ heading: section.heading.trim().slice(0, 80), body: section.body.trim().slice(0, 2000) })).filter((section) => section.heading && section.body);
  doc.faqs = edit.faqs.slice(0, 8).map((faq) => ({ q: faq.q.trim().slice(0, 160), a: faq.a.trim().slice(0, 800) })).filter((faq) => faq.q && faq.a);
  const score = scoreDocument(doc, Boolean(row.duplicate_of));
  const schema = validateStructuredData(doc);
  if (!schema.ok) {
    score.mandatoryFailures.push(...schema.issues);
    score.publication = "reject";
    score.indexable = false;
  }
  const current = String(row.status);
  let status = current;
  let indexable = false;
  if (score.mandatoryFailures.length || score.publication !== "eligible") {
    status = score.total >= 70 ? "needs_improvement" : "candidate";
  } else if (current === "published") {
    status = "published";
    indexable = true;
  } else if (current === "noindex" || current === "archived") {
    status = current;
  } else {
    status = "awaiting_review";
  }
  await db.query(
    `UPDATE seo_candidates SET content_json = $2, quality_score = $3, quality_json = $4, status = $5, indexable = $6,
      reviewed_at = NOW(), reviewed_by = $7, content_changed_at = NOW() WHERE id = $1`,
    [id, JSON.stringify(doc), score.total, JSON.stringify(score), status, indexable, actor],
  );
  await db.query(
    `INSERT INTO seo_reviews (id, candidate_id, action, actor, note) VALUES ($1,$2,'edit',$3,$4)`,
    [newId(), id, actor, `Edited content. Score ${score.total}. Status ${status}.`],
  );
  return { score, status, schema };
}
