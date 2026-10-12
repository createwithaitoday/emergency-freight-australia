import type { DistanceResult } from "@/lib/pricing/types";
import { findPlace, haversineKm, knownRoadKilometres } from "@/lib/geo/places";

export interface DistanceQuery {
  pickupAddress?: string;
  pickupSuburb?: string;
  pickupPostcode: string;
  deliveryAddress?: string;
  deliverySuburb?: string;
  deliveryPostcode: string;
}

export async function resolveDistance(query: DistanceQuery): Promise<DistanceResult> {
  const google = await googleDistance(query);
  if (google) return google;
  const routed = await openRouteDistance(query);
  if (routed) return routed;

  const known = knownRoadKilometres(query.pickupPostcode, query.deliveryPostcode);
  if (known) {
    return {
      kilometres: known,
      source: "known_route",
      label: "published capital or regional road distance, not door to door",
    };
  }

  const from = findPlace(query.pickupSuburb, query.pickupPostcode);
  const to = findPlace(query.deliverySuburb, query.deliveryPostcode);
  if (from && to) {
    const straight = haversineKm(from, to);
    return {
      kilometres: Math.round(straight * 1.35 * 10) / 10,
      source: "unverified",
      label: "straight-line estimate with a road factor, not a verified route",
    };
  }

  return {
    kilometres: null,
    source: "unresolved",
    label: "address not resolved",
  };
}

async function googleDistance(query: DistanceQuery): Promise<DistanceResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const origins = formatAddress(query.pickupAddress, query.pickupSuburb, query.pickupPostcode);
  const destinations = formatAddress(query.deliveryAddress, query.deliverySuburb, query.deliveryPostcode);
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", origins);
  url.searchParams.set("destinations", destinations);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("units", "metric");
  url.searchParams.set("region", "au");
  url.searchParams.set("key", key);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      rows?: { elements?: { status?: string; distance?: { value?: number } }[] }[];
    };
    const element = body.rows?.[0]?.elements?.[0];
    if (element?.status !== "OK" || !element.distance?.value) return null;
    return {
      kilometres: element.distance.value / 1000,
      source: "routing_api",
      label: "driving distance from the routing provider",
    };
  } catch {
    return null;
  }
}

async function openRouteDistance(query: DistanceQuery): Promise<DistanceResult | null> {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) return null;
  const from = findPlace(query.pickupSuburb, query.pickupPostcode);
  const to = findPlace(query.deliverySuburb, query.deliveryPostcode);
  if (!from || !to) return null;
  try {
    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { routes?: { summary?: { distance?: number } }[] };
    const metres = body.routes?.[0]?.summary?.distance;
    if (!metres) return null;
    return {
      kilometres: metres / 1000,
      source: "postcode_route",
      label: "road distance between locality centres, not door to door",
    };
  } catch {
    return null;
  }
}

function formatAddress(line: string | undefined, suburb: string | undefined, postcode: string) {
  return [line, suburb, postcode, "Australia"].filter(Boolean).join(", ");
}
