/** Service, industry and route catalogue. Kilometres are only the corridor allowances already published on this site. */

export const LOCAL_SERVICES = [
  { slug: "emergency-courier", name: "Emergency Courier", keyword: "emergency courier", intent: "Immediate pickup request" },
  { slug: "urgent-courier", name: "Urgent Courier", keyword: "urgent courier", intent: "Same-day commercial courier request" },
  { slug: "same-day-courier", name: "Same-Day Courier", keyword: "same day courier", intent: "Delivery requested for the same day" },
  { slug: "after-hours-courier", name: "After-Hours Courier", keyword: "after hours courier", intent: "Evening, early morning or weekend request" },
  { slug: "overnight-delivery", name: "Overnight Delivery", keyword: "overnight delivery", intent: "Overnight handling request" },
  { slug: "dedicated-direct-delivery", name: "Dedicated Direct Delivery", keyword: "dedicated direct delivery", intent: "One vehicle for one job" },
  { slug: "urgent-industrial-parts", name: "Urgent Industrial Parts Delivery", keyword: "urgent industrial parts delivery", intent: "Line-down or breakdown parts" },
  { slug: "interstate-hotshot", name: "Interstate Hotshot Transport", keyword: "interstate hotshot", intent: "Dedicated road freight beyond the city" },
] as const;

export const INDUSTRIES: { slug: string; name: string; goods: string; use: string; handling: string }[] = [
  { slug: "manufacturing", name: "Manufacturing", goods: "machined components, tooling, fasteners and production consumables", use: "A missing part can stop a line. The request is for a direct pickup from the supplier and a drop at the plant.", handling: "Tell us the weight, whether it is palletised, and if the dock needs a forklift or tail lift." },
  { slug: "industrial-maintenance", name: "Industrial maintenance", goods: "bearings, seals, motors, sensors and breakdown spares", use: "Maintenance crews request a part when a machine is already down.", handling: "Site induction and dock rules belong in the access notes. They are not assumed." },
  { slug: "engineering", name: "Engineering", goods: "fixtures, patterns, prototypes and machined parts", use: "Engineering workshops move one-off parts between a machine shop and a customer.", handling: "Fragile or unfinished surfaces should be declared. That is a handling note, not an insurance statement." },
  { slug: "construction", name: "Construction", goods: "fittings, fasteners, small plant parts and site consumables", use: "A crew can be waiting on a fitting that was missed in the morning delivery.", handling: "Site access, inductions and unloading limits have to be in the request." },
  { slug: "automotive", name: "Automotive repair", goods: "mechanical, brake, suspension and body parts", use: "Workshops request parts from a supplier when a vehicle is off the road.", handling: "Batteries and other dangerous goods are reviewed. They are not accepted automatically." },
  { slug: "heavy-equipment", name: "Heavy equipment repair", goods: "filters, hoses, pins and dealer parts for plant", use: "A machine standing in a yard may need a dealer part the same day.", handling: "Large or oily components may need a ute or a tail lift. A van is not assumed." },
  { slug: "mining", name: "Mining and resources", goods: "permitted mechanical spares and consumables that are not explosives", use: "A site can request a spare when a breakdown is holding equipment.", handling: "Explosives, radioactive material and hazardous waste cannot be booked. Other dangerous goods need a declaration." },
  { slug: "agriculture", name: "Agriculture", goods: "machinery parts, bearings and workshop supplies", use: "Farms and dealers request a part when a machine is stopped in season.", handling: "Rural access, gate codes and unsealed roads belong in the booking notes." },
  { slug: "warehousing", name: "Warehousing", goods: "cartons and pallets that missed a network cut-off", use: "A warehouse can request a direct movement when the freight cannot wait for the next depot run.", handling: "Pallet size and dock equipment change the vehicle." },
  { slug: "wholesale", name: "Wholesale distribution", goods: "trade packs and replenishment cartons", use: "Wholesalers request a direct drop to a trade customer.", handling: "A purchase order can be recorded on the request." },
  { slug: "electrical", name: "Electrical contractors", goods: "switchgear, cable reels, fittings and test equipment", use: "Contractors request material from a wholesaler to a job site.", handling: "Cable reels and boards may not fit a car. Dimensions are required." },
  { slug: "hvac", name: "HVAC and refrigeration", goods: "compressors, fans, controls and fittings that are not a temperature-controlled load", use: "A plant room or shop can be waiting on a replacement component.", handling: "This service does not claim refrigerated or temperature-controlled transport." },
  { slug: "plumbing", name: "Plumbing and mechanical services", goods: "pumps, valves, pipe fittings and tools", use: "Plumbers request a part from a merchant to a job.", handling: "Long lengths and heavy pumps need an honest size and weight." },
  { slug: "medical-equipment", name: "Medical equipment", goods: "permitted equipment parts and non-clinical commercial supplies", use: "A supplier can request movement of equipment that is not a regulated medical consignment.", handling: "This page does not offer pathology, pharmaceutical or regulated medical transport." },
  { slug: "aviation-parts", name: "Aviation parts", goods: "commercial aircraft components packed for road movement", use: "A maintenance provider can request a part to or from an airport precinct.", handling: "Airline acceptance, security screening and air waybills are a separate coordination job when a flight is required." },
  { slug: "marine", name: "Marine equipment", goods: "mechanical spares, hoses and workshop items for vessels and yards", use: "Yards request parts when a vessel is waiting.", handling: "Oversized shafts or engines are quoted. They are not priced as a parcel." },
  { slug: "telecommunications", name: "Telecommunications", goods: "radios, antennas, spares and test sets", use: "Field teams request a replacement from a store to a site.", handling: "Tower sites often have access rules that must be written in the request." },
  { slug: "data-centres", name: "Data centres", goods: "spare parts, boards and tools for a facility", use: "A facility can request a part when a piece of equipment has failed.", handling: "Loading docks and security desks need a contact name. We do not claim a right of entry." },
  { slug: "printing", name: "Printing and commercial production", goods: "plates, stock, finished work and machine parts", use: "A print deadline can depend on one missing item.", handling: "Finished work should be described if it is easily damaged." },
  { slug: "food-production", name: "Food production", goods: "packaging, parts and permitted freight that does not need temperature control", use: "A plant can request a mechanical part or a packaging item.", handling: "This service does not claim chilled, frozen or food-grade certified transport." },
  { slug: "equipment-hire", name: "Equipment hire", goods: "hire spares and small attachments", use: "Yards move a part between branches or out to a machine on hire.", handling: "Attachments that need a truck are quoted from the dimensions." },
  { slug: "fabrication", name: "Fabrication and metalworking", goods: "cut parts, folded sheet and fixtures", use: "Fabricators send a finished piece to a site or another workshop.", handling: "Sharp edges and long lengths must be packed. The length in centimetres is required." },
  { slug: "retail-stock", name: "Commercial retail stock transfers", goods: "cartons of retail stock between a store and a warehouse", use: "A store can request stock that cannot wait for the regular run.", handling: "This is commercial freight, not a consumer parcel network." },
  { slug: "events", name: "Event production", goods: "cables, fixtures, cases and exhibition equipment", use: "Production companies request equipment when a bump-in time is close.", handling: "A deadline in the form is a request. It is accepted only if dispatch confirms it." },
];

export type HubNote = { state: string; name: string; postcode: string; note: string };

export const HUBS: HubNote[] = [
  { state: "NSW", name: "Sydney", postcode: "2000", note: "Postcode 2000 is the city centre. Port Botany, the airport and Western Sydney are different addresses and can change the distance." },
  { state: "NSW", name: "Parramatta", postcode: "2150", note: "Parramatta is a Western Sydney commercial centre. It is not the same run as a Sydney CBD pickup." },
  { state: "NSW", name: "Newcastle", postcode: "2300", note: "Newcastle is a port city on the Hunter. It uses the dedicated-vehicle model, not the Sydney metro minimum." },
  { state: "NSW", name: "Wollongong", postcode: "2500", note: "Wollongong and Port Kembla sit in the Illawarra. A short run south of Sydney is still priced from the addresses." },
  { state: "NSW", name: "Gosford", postcode: "2250", note: "Gosford is on the Central Coast. It is outside the core Sydney postcode band used for the metro card." },
  { state: "QLD", name: "Brisbane", postcode: "4000", note: "Brisbane CBD, the airport and the port are different jobs. A Gold Coast address is not automatically included." },
  { state: "QLD", name: "Southport", postcode: "4215", note: "Southport is a Gold Coast locality. It is not priced as a Brisbane CBD delivery." },
  { state: "QLD", name: "Townsville", postcode: "4810", note: "Townsville is in North Queensland. Road time from Brisbane is long and is not published here as a guaranteed transit." },
  { state: "QLD", name: "Cairns", postcode: "4870", note: "Cairns is in Far North Queensland. Fulfilment depends on a carrier who will take the lane." },
  { state: "QLD", name: "Toowoomba", postcode: "4350", note: "Toowoomba is on the Darling Downs. The range road from Brisbane is part of the driving distance, not a straight line." },
  { state: "VIC", name: "Melbourne", postcode: "3000", note: "Melbourne 3000 is the city centre. Tullamarine and the port are extra driving distance." },
  { state: "VIC", name: "Geelong", postcode: "3220", note: "Geelong is a separate city west of Melbourne. It is not an inner-Melbourne suburb price." },
  { state: "VIC", name: "Ballarat", postcode: "3350", note: "Ballarat is a regional city in western Victoria. A dedicated vehicle is requested, not assumed to be waiting there." },
  { state: "VIC", name: "Bendigo", postcode: "3550", note: "Bendigo is in central Victoria. The request is arranged against the addresses, not a standing local depot." },
  { state: "VIC", name: "Dandenong", postcode: "3175", note: "Dandenong is a south-eastern Melbourne industrial and commercial centre." },
];

export const DESTINATIONS: HubNote[] = [
  ...HUBS,
  { state: "ACT", name: "Canberra", postcode: "2600", note: "Canberra is a destination. Requests still start from New South Wales, Queensland or Victoria." },
  { state: "SA", name: "Adelaide", postcode: "5000", note: "Adelaide is a long dedicated road job from the east coast. Rest and a carrier cost are confirmed before the job is accepted." },
  { state: "WA", name: "Perth", postcode: "6000", note: "Perth is arranged case by case. A road hotshot formula is not a verified transcontinental rate." },
  { state: "TAS", name: "Hobart", postcode: "7000", note: "Hobart needs a sea or air leg plus local cartage. It is not a direct road vehicle from the mainland." },
  { state: "NT", name: "Stuart Park", postcode: "0820", note: "Stuart Park is a verified Darwin locality in postcode 0820. Other Darwin addresses are quoted from the street, not from this locality name alone." },
];

/** Published city-to-city road allowances already used on the website. Not door-to-door distances. */
export const PUBLISHED_CORRIDOR_KM: Record<string, number> = {
  "sydney-melbourne": 878,
  "sydney-brisbane": 922,
  "sydney-adelaide": 1375,
  "sydney-canberra": 286,
  "sydney-newcastle": 162,
  "sydney-wollongong": 86,
};

export type RouteDef = {
  slug: string;
  origin: { state: string; name: string; postcode: string };
  destination: { state: string; name: string; postcode: string };
  kmKey?: keyof typeof PUBLISHED_CORRIDOR_KM;
};

const city = {
  sydney: { state: "NSW", name: "Sydney", postcode: "2000" },
  brisbane: { state: "QLD", name: "Brisbane", postcode: "4000" },
  melbourne: { state: "VIC", name: "Melbourne", postcode: "3000" },
  adelaide: { state: "SA", name: "Adelaide", postcode: "5000" },
  canberra: { state: "ACT", name: "Canberra", postcode: "2600" },
  perth: { state: "WA", name: "Perth", postcode: "6000" },
  hobart: { state: "TAS", name: "Hobart", postcode: "7000" },
  newcastle: { state: "NSW", name: "Newcastle", postcode: "2300" },
  wollongong: { state: "NSW", name: "Wollongong", postcode: "2500" },
  geelong: { state: "VIC", name: "Geelong", postcode: "3220" },
  townsville: { state: "QLD", name: "Townsville", postcode: "4810" },
  darwin: { state: "NT", name: "Stuart Park", postcode: "0820" },
};

function route(slug: string, origin: RouteDef["origin"], destination: RouteDef["destination"], kmKey?: RouteDef["kmKey"]): RouteDef {
  return { slug, origin, destination, kmKey };
}

export const ROUTES: RouteDef[] = [
  route("sydney-to-melbourne", city.sydney, city.melbourne, "sydney-melbourne"),
  route("melbourne-to-sydney", city.melbourne, city.sydney, "sydney-melbourne"),
  route("sydney-to-brisbane", city.sydney, city.brisbane, "sydney-brisbane"),
  route("brisbane-to-sydney", city.brisbane, city.sydney, "sydney-brisbane"),
  route("sydney-to-adelaide", city.sydney, city.adelaide, "sydney-adelaide"),
  route("adelaide-to-sydney", city.adelaide, city.sydney, "sydney-adelaide"),
  route("sydney-to-canberra", city.sydney, city.canberra, "sydney-canberra"),
  route("canberra-to-sydney", city.canberra, city.sydney, "sydney-canberra"),
  route("sydney-to-perth", city.sydney, city.perth),
  route("sydney-to-hobart", city.sydney, city.hobart),
  route("sydney-to-darwin", city.sydney, city.darwin),
  route("brisbane-to-melbourne", city.brisbane, city.melbourne),
  route("melbourne-to-brisbane", city.melbourne, city.brisbane),
  route("brisbane-to-adelaide", city.brisbane, city.adelaide),
  route("brisbane-to-perth", city.brisbane, city.perth),
  route("melbourne-to-adelaide", city.melbourne, city.adelaide),
  route("melbourne-to-perth", city.melbourne, city.perth),
  route("melbourne-to-canberra", city.melbourne, city.canberra),
  route("newcastle-to-brisbane", city.newcastle, city.brisbane),
  route("wollongong-to-melbourne", city.wollongong, city.melbourne),
  route("geelong-to-sydney", city.geelong, city.sydney),
  route("brisbane-to-townsville", city.brisbane, city.townsville),
];

export const STATE_NAMES: Record<string, string> = {
  NSW: "New South Wales",
  QLD: "Queensland",
  VIC: "Victoria",
  ACT: "Australian Capital Territory",
  SA: "South Australia",
  WA: "Western Australia",
  TAS: "Tasmania",
  NT: "Northern Territory",
};

export function placeKey(place: { state: string; name: string; postcode: string }) {
  return `${place.state}|${place.name.toLowerCase()}|${place.postcode}`;
}

export function isHub(place: { state: string; name: string; postcode: string }) {
  return HUBS.some((hub) => placeKey(hub) === placeKey(place));
}
