import { brand } from "@/lib/brand";
import {
  DESTINATIONS,
  HUBS,
  INDUSTRIES,
  LOCAL_SERVICES,
  PUBLISHED_CORRIDOR_KM,
  ROUTES,
  STATE_NAMES,
  isHub,
  placeKey,
  type HubNote,
  type RouteDef,
} from "@/lib/seo/catalog";
import type { SeoDocument } from "@/lib/seo/quality";

export type GeoPlace = {
  sourceId: string;
  name: string;
  slug: string;
  state: string;
  postcode: string;
  lga: string;
  lgaCode: string;
  lat: number;
  lng: number;
  sa2: string;
  updatedOn: string;
  origin: boolean;
};

const AVAILABILITY = "A request is not a confirmed booking. Collection and transit depend on a vehicle, the freight and a carrier accepting the job.";

export function serviceDocument(place: GeoPlace, service: (typeof LOCAL_SERVICES)[number]): SeoDocument {
  const hub = isHub(place);
  const stateName = STATE_NAMES[place.state] ?? place.state;
  const path = `/services/${service.slug}/${place.state.toLowerCase()}/${place.slug}-${place.postcode}`;
  const hubNote = HUBS.find((item) => placeKey(item) === placeKey({ state: place.state, name: place.name, postcode: place.postcode }))?.note;
  const sections = [
    { heading: "What you can request", body: `${service.name} from ${place.name} is a request for urgent commercial freight. ${AVAILABILITY}` },
    { heading: "Where this page applies", body: `${place.name} is a ${place.state} delivery locality in postcode ${place.postcode}${place.lga ? `, in ${place.lga}` : ""}. ${hubNote ?? "The page uses that locality and postcode. It does not claim a driver is based there."}` },
    { heading: "How the price is calculated", body: "The calculator prices from the current rate card on the server: a base fee plus chargeable road kilometres, raised to the service minimum when the sum is lower, then extras that are actually known. The browser does not set the amount." },
    { heading: "What to send with the request", body: "Enter both street addresses, the weight and dimensions, and a deadline if you have one. Dangerous goods need a declaration and are not accepted automatically." },
  ];
  return baseDoc({
    title: `${service.name} ${place.name} ${place.postcode}`.slice(0, 68),
    description: `Request ${service.name.toLowerCase()} from ${place.name} ${place.state} ${place.postcode}. Indicative pricing, confirmed only when a vehicle and the route are accepted.`.slice(0, 168),
    h1: `${service.name} in ${place.name}`,
    summary: `${service.name} can be requested from ${place.name}, ${stateName}. The price on this site is indicative until dispatch confirms availability and any carrier cost.`,
    sections,
    path,
    enriched: hub,
    fingerprint: hub ? `hub-${service.slug}` : "local-service-v1",
    geoValid: Boolean(place.postcode && place.state && place.name),
    localFacts: [place.name, place.postcode, place.lga, place.state],
    preset: { pickupSuburb: place.name, pickupPostcode: place.postcode },
    links: [
      { href: `/book?pickupSuburb=${encodeURIComponent(place.name)}&pickupPostcode=${place.postcode}`, label: "Calculate delivery price" },
      { href: `/locations/${place.state.toLowerCase()}`, label: `${stateName} coverage` },
      { href: "/pricing", label: "Pricing rules" },
      { href: "/industries/manufacturing", label: "Manufacturing freight" },
    ],
    crumbs: [
      { href: "/services", label: "Services" },
      { href: `/locations/${place.state.toLowerCase()}`, label: stateName },
      { href: path, label: place.name },
    ],
  });
}

export function stateDocument(state: string): SeoDocument {
  const name = STATE_NAMES[state];
  const path = `/locations/${state.toLowerCase()}`;
  return baseDoc({
    title: `Urgent delivery from ${name}`,
    description: `Emergency courier and dedicated freight requests originating in ${name}, for delivery elsewhere in Australia when a carrier accepts the job.`,
    h1: `Urgent delivery from ${name}`,
    summary: `Requests can start in ${name}. Destinations elsewhere in Australia are arranged only when the route, the freight and a carrier line up. This is not a claim that every town has a waiting vehicle.`,
    sections: [
      { heading: "Origin coverage", body: `${name} is one of the three origin states for this service, together with the others named on the coverage pages. A suburb page is published only after it passes a quality review.` },
      { heading: "Destinations", body: "A job can be requested to another state or territory. Interstate hotshot prices stay indicative until a carrier cost is recorded. Hobart needs sea or air cartage. Perth is quoted as a specific job." },
      { heading: "How to ask", body: "Use the calculator with the pickup suburb and postcode. You can pay the server-calculated estimate or email the request. Payment of an estimate does not by itself confirm a vehicle." },
    ],
    path,
    enriched: true,
    fingerprint: `state-${state}`,
    geoValid: Boolean(name),
    localFacts: [name, state, "origin state"],
    links: [
      { href: "/book", label: "Calculate delivery price" },
      { href: "/routes/sydney-to-melbourne", label: "Sydney to Melbourne" },
      { href: "/routes/sydney-to-brisbane", label: "Sydney to Brisbane" },
      { href: "/pricing", label: "Pricing rules" },
    ],
    crumbs: [
      { href: "/locations", label: "Locations" },
      { href: path, label: name },
    ],
  });
}

export function routeDocument(route: RouteDef, origin: GeoPlace, destination: GeoPlace): SeoDocument {
  const km = route.kmKey ? PUBLISHED_CORRIDOR_KM[route.kmKey] : undefined;
  const path = `/routes/${route.slug}`;
  const destinationNote = DESTINATIONS.find((item) => placeKey(item) === placeKey({ state: destination.state, name: destination.name, postcode: destination.postcode }))?.note;
  const distance = km
    ? `A published city-to-city road allowance for this corridor is about ${km} kilometres. It is not the driving distance between your two street addresses.`
    : "This page does not publish a fixed kilometre rate. The driving distance is calculated from the addresses, and a carrier quote is required before the price is treated as confirmed.";
  return baseDoc({
    title: `${origin.name} to ${destination.name} urgent freight`.slice(0, 68),
    description: `Request dedicated freight from ${origin.name} to ${destination.name}. Indicative until a carrier cost and a vehicle are confirmed.`.slice(0, 168),
    h1: `${origin.name} to ${destination.name} urgent freight`,
    summary: `This route can be requested from ${origin.name} (${origin.state} ${origin.postcode}) to ${destination.name} (${destination.state} ${destination.postcode}). ${AVAILABILITY}`,
    sections: [
      { heading: "Route basis", body: distance },
      { heading: "Service options", body: "Road jobs use the dedicated hotshot model: base fee, chargeable kilometres and a minimum, then verified tolls, rest and carrier costs when they are known. Next-flight coordination is a separate manual quote." },
      { heading: "What is not promised", body: `${destinationNote ?? "Door-to-door timing is not published on this page."} Overnight arrival and immediate collection are not offered unless dispatch accepts that deadline on the booking.` },
      { heading: "How fulfilment is arranged", body: "The origin is in New South Wales, Queensland or Victoria, or the reverse of one of those corridors. A third-party carrier may run the linehaul. No carrier is named here as a partner." },
    ],
    path,
    enriched: true,
    fingerprint: `route-${route.slug}`,
    geoValid: true,
    routeEvidence: true,
    localFacts: [origin.name, origin.postcode, destination.name, destination.postcode],
    preset: {
      pickupSuburb: origin.name,
      pickupPostcode: origin.postcode,
      deliverySuburb: destination.name,
      deliveryPostcode: destination.postcode,
    },
    links: [
      { href: `/book?pickupSuburb=${encodeURIComponent(origin.name)}&pickupPostcode=${origin.postcode}&deliverySuburb=${encodeURIComponent(destination.name)}&deliveryPostcode=${destination.postcode}`, label: "Calculate this route" },
      { href: `/locations/${origin.state.toLowerCase()}`, label: `${STATE_NAMES[origin.state]} origins` },
      { href: `/locations/${destination.state.toLowerCase()}`, label: `${STATE_NAMES[destination.state] ?? destination.state}` },
      { href: "/services/interstate-hotshot-freight", label: "Interstate hotshot" },
    ],
    crumbs: [
      { href: "/locations", label: "Locations" },
      { href: path, label: `${origin.name} to ${destination.name}` },
    ],
  });
}

export function industryDocument(industry: (typeof INDUSTRIES)[number], hub?: HubNote, place?: GeoPlace): SeoDocument {
  const path = hub && place ? `/industries/${industry.slug}/${place.state.toLowerCase()}/${place.slug}-${place.postcode}` : `/industries/${industry.slug}`;
  const where = place ? ` in ${place.name}` : "";
  return baseDoc({
    title: `${industry.name} urgent freight${where}`.slice(0, 68),
    description: `${industry.use} Request a price. Availability is confirmed before the job is accepted.`.slice(0, 168),
    h1: `${industry.name} freight${where}`,
    summary: industry.use,
    sections: [
      { heading: "Goods this page covers", body: `Typical freight includes ${industry.goods}. Prohibited goods on the exclusions page cannot be booked.` },
      { heading: "Handling", body: industry.handling },
      { heading: "How a request works", body: `${AVAILABILITY} The calculator asks for size and weight because those facts decide whether a van rate applies.` },
      ...(place ? [{ heading: "Location", body: `${place.name}, ${place.state} ${place.postcode}${place.lga ? `, ${place.lga}` : ""}. ${hub?.note ?? ""}` }] : []),
    ],
    path,
    enriched: true,
    fingerprint: `industry-${industry.slug}${place ? "-hub" : ""}`,
    geoValid: place ? Boolean(place.postcode) : true,
    localFacts: place ? [place.name, place.postcode, place.lga || place.state] : [industry.name, "NSW", "QLD", "VIC"],
    preset: place ? { pickupSuburb: place.name, pickupPostcode: place.postcode } : undefined,
    links: [
      { href: place ? `/book?pickupSuburb=${encodeURIComponent(place.name)}&pickupPostcode=${place.postcode}` : "/book", label: "Calculate delivery price" },
      { href: "/industries", label: "Industries" },
      { href: "/services/industrial-parts-delivery", label: "Industrial parts" },
      { href: "/legal/freight-exclusions", label: "Freight exclusions" },
    ],
    crumbs: [
      { href: "/industries", label: "Industries" },
      { href: path, label: industry.name },
    ],
  });
}

function baseDoc(input: {
  title: string;
  description: string;
  h1: string;
  summary: string;
  sections: { heading: string; body: string }[];
  path: string;
  enriched: boolean;
  fingerprint: string;
  geoValid: boolean;
  localFacts: string[];
  links: { href: string; label: string }[];
  crumbs: { href: string; label: string }[];
  preset?: SeoDocument["preset"];
  routeEvidence?: boolean;
}): SeoDocument {
  return {
    title: input.title,
    description: input.description,
    h1: input.h1,
    summary: input.summary,
    sections: input.sections,
    faqs: [
      { q: "Is the price confirmed?", a: "No. The calculator shows an estimate from the current rules. A confirmed price is a figure dispatch has authorised." },
      { q: "Can I pay the estimate?", a: `You can pay the server-calculated estimate by card or PayPal, or email the request to ${brand.email}. Paying the estimate does not confirm that a vehicle is free.` },
    ],
    links: input.links,
    breadcrumbs: input.crumbs,
    canonicalPath: input.path,
    enriched: input.enriched,
    fingerprint: input.fingerprint,
    geoValid: input.geoValid,
    serviceFeasible: true,
    routeEvidence: input.routeEvidence ?? true,
    localFacts: input.localFacts,
    schemaType: "Service",
    preset: input.preset,
  };
}

export function findPlace(places: GeoPlace[], hint: { state: string; name: string; postcode: string }) {
  return places.find((place) => place.state === hint.state && place.name.toLowerCase() === hint.name.toLowerCase() && place.postcode === hint.postcode);
}

export { DESTINATIONS, HUBS, INDUSTRIES, LOCAL_SERVICES, ROUTES };
