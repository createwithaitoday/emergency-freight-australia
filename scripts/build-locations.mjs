import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error("Usage: node scripts/build-locations.mjs <australian_postcodes.csv>");
  process.exit(1);
}

const text = readFileSync(sourcePath, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines[0]);
const index = Object.fromEntries(header.map((name, i) => [name, i]));

const originStates = new Set(["NSW", "QLD", "VIC"]);
const allStates = ["NSW", "QLD", "VIC", "ACT", "SA", "WA", "TAS", "NT"];
const locations = [];
const seen = new Set();

for (const line of lines.slice(1)) {
  const cols = parseCsvLine(line);
  const type = cols[index.type];
  const state = cols[index.state];
  if (type !== "Delivery Area" || !allStates.includes(state)) continue;
  const name = toTitle(cols[index.locality]);
  const postcode = cols[index.postcode].padStart(4, "0");
  if (!/^\d{4}$/.test(postcode)) continue;
  const lat = Number(cols[index.Lat_precise] || cols[index.lat]);
  const lng = Number(cols[index.Long_precise] || cols[index.long]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  const lga = cols[index.lgaregion] ? toTitle(cols[index.lgaregion]) : "";
  const key = `${state}|${slugify(name)}|${postcode}`;
  if (seen.has(key)) continue;
  seen.add(key);
  locations.push({
    sourceId: cols[index.id],
    name,
    slug: slugify(name),
    state,
    postcode,
    lga,
    lgaCode: cols[index.lgacode] || "",
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
    sa2: cols[index.SA2_NAME_2021] ? toTitle(cols[index.SA2_NAME_2021]) : "",
    updatedOn: extractDate(cols[index.status]),
    origin: originStates.has(state),
  });
}

mkdirSync(join(root, "data", "geo"), { recursive: true });
writeFileSync(join(root, "data", "geo", "locations.json"), JSON.stringify({
  source: "Australia Post delivery localities with ABS LGA and SA2 fields, compiled in the Matthew Proctor australian_postcodes dataset",
  licenceNote: "Locality and postcode names follow the Australia Post delivery list. Confirm licence before redistributing the raw file. This extract keeps locality, postcode, state, LGA and coordinates.",
  dataVersion: "extract-2026-10-13",
  locations,
}));
const byState = {};
for (const place of locations) byState[place.state] = (byState[place.state] || 0) + 1;
console.log(JSON.stringify({ total: locations.length, byState, origins: locations.filter((place) => place.origin).length }));

function parseCsvLine(line) {
  const cols = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      cols.push(cur);
      cur = "";
    } else cur += ch;
  }
  cols.push(cur);
  return cols;
}

function toTitle(value) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
    .replace(/\bMc([a-z])/g, (_, letter) => `Mc${letter.toUpperCase()}`);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractDate(status) {
  const match = String(status).match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!match) return "";
  const months = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  return `${match[3]}-${months[match[2]] || "01"}-${match[1].padStart(2, "0")}`;
}
