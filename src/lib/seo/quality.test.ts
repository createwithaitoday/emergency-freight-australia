import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCAL_SERVICES } from "@/lib/seo/catalog";
import { industryDocument, serviceDocument, type GeoPlace } from "@/lib/seo/compose";
import { plannedCandidateCount } from "@/lib/seo/inventory";
import { scoreDocument } from "@/lib/seo/quality";
import { INDUSTRIES } from "@/lib/seo/catalog";

const sydney: GeoPlace = {
  sourceId: "1",
  name: "Sydney",
  slug: "sydney",
  state: "NSW",
  postcode: "2000",
  lga: "Sydney",
  lgaCode: "17200",
  lat: -33.87,
  lng: 151.21,
  sa2: "Sydney",
  updatedOn: "2020-02-06",
  origin: true,
};

const suburb: GeoPlace = { ...sydney, name: "Example Town", slug: "example-town", postcode: "2999", lga: "Example Council" };

describe("seo quality gate", () => {
  it("publishes a reviewed city service page and holds a template suburb page", () => {
    const hub = scoreDocument(serviceDocument(sydney, LOCAL_SERVICES[0]), false);
    const plain = scoreDocument(serviceDocument(suburb, LOCAL_SERVICES[0]), false);
    expect(hub.total).toBeGreaterThanOrEqual(85);
    expect(hub.mandatoryFailures).toEqual([]);
    expect(hub.publication).toBe("eligible");
    expect(plain.publication).not.toBe("eligible");
    expect(plain.total).toBeLessThan(85);
  });

  it("rejects an unsupported guarantee even when the other checks pass", () => {
    const doc = serviceDocument(sydney, LOCAL_SERVICES[0]);
    doc.sections[0].body = "We offer guaranteed overnight collection with our fleet.";
    doc.enriched = true;
    const score = scoreDocument(doc, false);
    expect(score.mandatoryFailures.join(" ")).toMatch(/Unsupported/);
    expect(score.indexable).toBe(false);
  });

  it("rejects a duplicate url", () => {
    const score = scoreDocument(serviceDocument(sydney, LOCAL_SERVICES[0]), true);
    expect(score.duplication).toBe(0);
    expect(score.publication).toBe("reject");
  });

  it("keeps industry pages factual and free of medical-transport claims", () => {
    const medical = INDUSTRIES.find((item) => item.slug === "medical-equipment");
    expect(medical).toBeTruthy();
    const doc = industryDocument(medical!);
    expect(doc.summary.toLowerCase()).not.toMatch(/pathology|pharmaceutical/);
    expect(scoreDocument(doc, false).publication).toBe("eligible");
  });

  it("plans at least 100,000 candidates from the locality extract", () => {
    const file = path.join(process.cwd(), "data", "geo", "locations.json");
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { locations: { origin: boolean }[] };
    const origins = parsed.locations.filter((place) => place.origin).length;
    expect(origins).toBeGreaterThan(10000);
    expect(plannedCandidateCount(origins)).toBeGreaterThanOrEqual(100000);
  });
});
