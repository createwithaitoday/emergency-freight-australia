import { zoneForPostcode, type Zone } from "@/lib/pricing/engine";

export interface Place {
  suburb: string;
  postcode: string;
  state: string;
  lat: number;
  lng: number;
}

export const PLACES: Place[] = [
  ["Sydney", "2000", "NSW", -33.8688, 151.2093],
  ["Darlinghurst", "2010", "NSW", -33.8795, 151.219],
  ["Surry Hills", "2010", "NSW", -33.884, 151.2104],
  ["Alexandria", "2015", "NSW", -33.909, 151.195],
  ["Redfern", "2016", "NSW", -33.893, 151.204],
  ["Botany", "2019", "NSW", -33.945, 151.196],
  ["Mascot", "2020", "NSW", -33.928, 151.193],
  ["Bondi Junction", "2022", "NSW", -33.8917, 151.2475],
  ["Bondi", "2026", "NSW", -33.8915, 151.2767],
  ["Randwick", "2031", "NSW", -33.9145, 151.2415],
  ["Newtown", "2042", "NSW", -33.898, 151.179],
  ["Leichhardt", "2040", "NSW", -33.883, 151.157],
  ["Marrickville", "2204", "NSW", -33.911, 151.155],
  ["North Sydney", "2060", "NSW", -33.84, 151.207],
  ["Chatswood", "2067", "NSW", -33.796, 151.183],
  ["Hornsby", "2077", "NSW", -33.704, 151.099],
  ["Manly", "2095", "NSW", -33.798, 151.288],
  ["Ryde", "2112", "NSW", -33.814, 151.105],
  ["Auburn", "2144", "NSW", -33.849, 151.033],
  ["Blacktown", "2148", "NSW", -33.769, 150.906],
  ["Parramatta", "2150", "NSW", -33.815, 151.001],
  ["Smithfield", "2164", "NSW", -33.853, 150.948],
  ["Wetherill Park", "2164", "NSW", -33.849, 150.901],
  ["Liverpool", "2170", "NSW", -33.92, 150.923],
  ["Bankstown", "2200", "NSW", -33.917, 151.035],
  ["Sutherland", "2232", "NSW", -34.031, 151.057],
  ["Campbelltown", "2560", "NSW", -34.065, 150.814],
  ["Penrith", "2750", "NSW", -33.751, 150.694],
  ["Eastern Creek", "2766", "NSW", -33.8, 150.847],
  ["Newcastle", "2300", "NSW", -32.9283, 151.7817],
  ["Gosford", "2250", "NSW", -33.425, 151.342],
  ["Wollongong", "2500", "NSW", -34.4278, 150.8931],
  ["Nowra", "2541", "NSW", -34.884, 150.6],
  ["Coffs Harbour", "2450", "NSW", -30.2963, 153.1135],
  ["Port Macquarie", "2444", "NSW", -31.433, 152.908],
  ["Tamworth", "2340", "NSW", -31.092, 150.932],
  ["Dubbo", "2830", "NSW", -32.243, 148.601],
  ["Orange", "2800", "NSW", -33.284, 149.099],
  ["Bathurst", "2795", "NSW", -33.419, 149.577],
  ["Wagga Wagga", "2650", "NSW", -35.108, 147.36],
  ["Albury", "2640", "NSW", -36.0737, 146.9135],
  ["Broken Hill", "2880", "NSW", -31.953, 141.453],
  ["Bourke", "2840", "NSW", -30.09, 145.937],
  ["Canberra", "2600", "ACT", -35.2809, 149.13],
  ["Fyshwick", "2609", "ACT", -35.325, 149.173],
  ["Melbourne", "3000", "VIC", -37.8136, 144.9631],
  ["Tullamarine", "3043", "VIC", -37.701, 144.881],
  ["Geelong", "3220", "VIC", -38.1499, 144.3617],
  ["Brisbane", "4000", "QLD", -27.4698, 153.0251],
  ["Eagle Farm", "4009", "QLD", -27.433, 153.083],
  ["Gold Coast", "4217", "QLD", -28.0167, 153.4],
  ["Adelaide", "5000", "SA", -34.9285, 138.6007],
  ["Perth", "6000", "WA", -31.9523, 115.8613],
  ["Hobart", "7000", "TAS", -42.8821, 147.3272],
  ["Darwin", "0800", "NT", -12.4634, 130.8456],
].map(([suburb, postcode, state, lat, lng]) => ({
  suburb: String(suburb),
  postcode: String(postcode),
  state: String(state),
  lat: Number(lat),
  lng: Number(lng),
}));

export function searchPlaces(query: string) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return PLACES.filter(
    (place) => place.suburb.toLowerCase().includes(needle) || place.postcode.startsWith(needle),
  ).slice(0, 8);
}

export function findPlace(suburb: string | undefined, postcode: string) {
  const cleaned = suburb?.trim().toLowerCase();
  if (cleaned) {
    const exact = PLACES.find((place) => place.postcode === postcode && place.suburb.toLowerCase() === cleaned);
    if (exact) return exact;
  }
  return PLACES.find((place) => place.postcode === postcode);
}

export function zoneLabel(postcode: string): Zone {
  return zoneForPostcode(postcode);
}

const CITY_BUCKETS: { id: string; test: (postcode: number) => boolean }[] = [
  { id: "syd", test: (n) => (n >= 2000 && n <= 2249) || (n >= 2555 && n <= 2574) || (n >= 2745 && n <= 2770) },
  { id: "mel", test: (n) => n >= 3000 && n <= 3207 },
  { id: "bne", test: (n) => n >= 4000 && n <= 4179 },
  { id: "adl", test: (n) => n >= 5000 && n <= 5199 },
  { id: "cbr", test: (n) => (n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920) },
  { id: "ntl", test: (n) => n >= 2280 && n <= 2309 },
  { id: "wol", test: (n) => n >= 2500 && n <= 2530 },
];

const KNOWN_ROAD_KM: Record<string, number> = {
  "syd:mel": 878,
  "syd:bne": 922,
  "syd:adl": 1375,
  "syd:cbr": 286,
  "syd:ntl": 162,
  "syd:wol": 86,
};

export function knownRoadKilometres(pickup: string, delivery: string) {
  const a = cityBucket(pickup);
  const b = cityBucket(delivery);
  if (!a || !b || a === b) return null;
  const key = [a, b].sort().join(":");
  const direct = KNOWN_ROAD_KM[`${a}:${b}`] ?? KNOWN_ROAD_KM[`${b}:${a}`] ?? KNOWN_ROAD_KM[key];
  return direct ?? null;
}

function cityBucket(postcode: string) {
  const n = Number(postcode);
  return CITY_BUCKETS.find((bucket) => bucket.test(n))?.id ?? null;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}
