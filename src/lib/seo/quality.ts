export type SeoSection = { heading: string; body: string };
export type SeoLink = { href: string; label: string };

export type SeoDocument = {
  title: string;
  description: string;
  h1: string;
  summary: string;
  sections: SeoSection[];
  faqs: { q: string; a: string }[];
  links: SeoLink[];
  breadcrumbs: SeoLink[];
  canonicalPath: string;
  enriched: boolean;
  fingerprint: string;
  geoValid: boolean;
  serviceFeasible: boolean;
  routeEvidence: boolean;
  localFacts: string[];
  schemaType: "Service" | "BreadcrumbList";
  preset?: {
    pickupSuburb?: string;
    pickupPostcode?: string;
    deliverySuburb?: string;
    deliveryPostcode?: string;
  };
};

const BANNED = [
  /guaranteed overnight/i,
  /guaranteed collection/i,
  /our fleet/i,
  /drivers in every/i,
  /5[- ]star/i,
  /certified dangerous goods/i,
  /temperature-controlled service/i,
  /we have a depot in/i,
  /\d[\d,]* completed deliveries/i,
];

export type ScoreBreakdown = {
  intent: number;
  unique: number;
  geographic: number;
  feasibility: number;
  conversion: number;
  local: number;
  internalLinks: number;
  technical: number;
  schema: number;
  duplication: number;
  total: number;
  mandatoryFailures: string[];
  indexable: boolean;
  publication: "eligible" | "improve" | "reject";
};

export function scoreDocument(doc: SeoDocument, duplicate: boolean): ScoreBreakdown {
  const text = [doc.title, doc.h1, doc.summary, ...doc.sections.map((section) => section.body), ...doc.faqs.map((faq) => faq.a)].join(" ");
  const unsupported = BANNED.some((pattern) => pattern.test(text)) || doc.sections.some((section) => /lorem ipsum|placeholder|TODO/i.test(section.body));
  const intent = doc.title.length > 10 && doc.h1.length > 10 && text.toLowerCase().includes(doc.h1.split(" ")[0]?.toLowerCase() ?? "x") ? 15 : 5;
  const unique = doc.enriched ? 20 : 4;
  const geographic = doc.geoValid ? 10 : 0;
  const feasibility = doc.serviceFeasible && !unsupported ? 15 : 0;
  const conversion = doc.links.some((link) => link.href.startsWith("/book")) ? 10 : 0;
  const local = doc.localFacts.filter(Boolean).length >= 3 ? 10 : Math.min(9, doc.localFacts.filter(Boolean).length * 3);
  const internalLinks = doc.links.length >= 3 ? 5 : doc.links.length >= 1 ? 2 : 0;
  const technical = doc.title.length >= 20 && doc.title.length <= 70 && doc.description.length >= 50 && doc.description.length <= 170 && doc.h1.length > 8 ? 5 : 2;
  const schema = doc.schemaType === "Service" && doc.breadcrumbs.length >= 2 ? 5 : 0;
  const duplication = duplicate ? 0 : 5;
  const total = intent + unique + geographic + feasibility + conversion + local + internalLinks + technical + schema + duplication;
  const mandatoryFailures: string[] = [];
  if (!doc.geoValid) mandatoryFailures.push("Missing geographic validation");
  if (!doc.serviceFeasible || unsupported) mandatoryFailures.push("Unsupported service claim");
  if (duplicate) mandatoryFailures.push("Duplicate or overlapping URL");
  if (!doc.routeEvidence) mandatoryFailures.push("Missing route or service evidence");
  if (doc.sections.length < 3 || doc.sections.some((section) => section.body.trim().length < 40)) mandatoryFailures.push("Placeholder or thin content");
  if (!doc.title || !doc.description || !doc.h1 || !doc.canonicalPath.startsWith("/")) mandatoryFailures.push("Incomplete metadata or canonical URL");
  const capped = Math.min(100, total);
  const publication = mandatoryFailures.length ? "reject" : capped >= 85 ? "eligible" : capped >= 70 ? "improve" : "reject";
  return {
    intent,
    unique,
    geographic,
    feasibility,
    conversion,
    local,
    internalLinks,
    technical,
    schema,
    duplication,
    total: capped,
    mandatoryFailures,
    indexable: publication === "eligible",
    publication,
  };
}

export function statusForScore(score: ScoreBreakdown, autoPublish: boolean, enriched: boolean) {
  if (score.mandatoryFailures.length || score.publication === "reject") return enriched ? "needs_improvement" : "candidate";
  if (score.publication === "improve") return "needs_improvement";
  if (autoPublish && enriched) return "published";
  if (enriched) return "published";
  return "awaiting_review";
}
