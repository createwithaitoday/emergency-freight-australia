import type {
  DistanceResult,
  PriceLine,
  PricingConfig,
  QuoteInput,
  QuoteResult,
  ServiceQuote,
  ServiceRate,
  VehicleSpec,
} from "@/lib/pricing/types";

export const PROHIBITED_CATEGORIES = new Set([
  "explosives",
  "firearms",
  "ammunition",
  "illegal_drugs",
  "live_animals",
  "human_remains",
  "cash",
  "hazardous_waste",
  "radioactive",
]);

export function sydneyParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    hour: Number(parts.hour),
    weekday: parts.weekday ?? "",
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function stateForPostcode(postcode: string) {
  const n = Number(postcode);
  if (!Number.isInteger(n)) return null;
  if ((n >= 200 && n <= 299) || (n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920)) return "ACT";
  if (n >= 800 && n <= 899) return "NT";
  if ((n >= 1000 && n <= 2599) || (n >= 2619 && n <= 2899) || (n >= 2921 && n <= 2999)) return "NSW";
  if ((n >= 3000 && n <= 3999) || (n >= 8000 && n <= 8999)) return "VIC";
  if ((n >= 4000 && n <= 4999) || (n >= 9000 && n <= 9999)) return "QLD";
  if (n >= 5000 && n <= 5999) return "SA";
  if (n >= 6000 && n <= 6999) return "WA";
  if (n >= 7000 && n <= 7999) return "TAS";
  return null;
}

export type Zone = "sydney_core" | "sydney_greater" | "regional_nsw" | "interstate" | "unknown";

export function zoneForPostcode(postcode: string): Zone {
  const n = Number(postcode);
  const state = stateForPostcode(postcode);
  if (!state || !Number.isInteger(n)) return "unknown";
  if (n >= 2000 && n <= 2234) return "sydney_core";
  if ((n >= 2235 && n <= 2249) || (n >= 2555 && n <= 2574) || (n >= 2745 && n <= 2770)) {
    return "sydney_greater";
  }
  if (state === "NSW") return "regional_nsw";
  return "interstate";
}

export function isSydneyZone(zone: Zone) {
  return zone === "sydney_core" || zone === "sydney_greater";
}

export function applyGst(taxableCents: number, config: PricingConfig) {
  if (!config.gstRegistered || config.gstRate <= 0) {
    return {
      netCents: taxableCents,
      gstCents: 0,
      totalCents: taxableCents,
      gstLabel: "GST is not applicable",
    };
  }
  if (config.pricesIncludeGst) {
    const netCents = Math.round(taxableCents / (1 + config.gstRate));
    const gstCents = taxableCents - netCents;
    return {
      netCents,
      gstCents,
      totalCents: taxableCents,
      gstLabel: "GST included",
    };
  }
  const gstCents = Math.round(taxableCents * config.gstRate);
  return {
    netCents: taxableCents,
    gstCents,
    totalCents: taxableCents + gstCents,
    gstLabel: "excluding GST",
  };
}

export function chargeableKilometres(kilometres: number | null) {
  if (kilometres == null || Number.isNaN(kilometres) || kilometres < 0) return null;
  return Math.max(1, Math.ceil(kilometres));
}

function vehicleFits(vehicle: VehicleSpec, input: QuoteInput) {
  const weight = input.packages * input.weightPerPackageKg;
  const freight = [input.lengthCm, input.widthCm, input.heightCm].sort((a, b) => b - a);
  const limits = [vehicle.maxLengthCm, vehicle.maxWidthCm, vehicle.maxHeightCm].sort((a, b) => b - a);
  return weight <= vehicle.maxWeightKg && freight[0] <= limits[0] && freight[1] <= limits[1] && freight[2] <= limits[2];
}

function chooseVehicle(config: PricingConfig, input: QuoteInput) {
  const requested = input.vehicleCode
    ? config.vehicles.find((vehicle) => vehicle.code === input.vehicleCode)
    : undefined;
  if (input.tailLiftRequired) {
    const tail = config.vehicles.find((vehicle) => vehicle.code === "tail_lift");
    return { vehicle: tail && vehicleFits(tail, input) ? tail : null, requested };
  }
  if (requested) {
    return { vehicle: vehicleFits(requested, input) ? requested : null, requested };
  }
  const preference = ["van", "ute", "tail_lift", "pantech", "car"];
  for (const code of preference) {
    const vehicle = config.vehicles.find((item) => item.code === code);
    if (vehicle && vehicleFits(vehicle, input)) return { vehicle, requested };
  }
  return { vehicle: null, requested };
}

function heavyCents(config: PricingConfig, totalKg: number) {
  const tiers = [...config.surcharges.heavyTiers].sort((a, b) => b.aboveKg - a.aboveKg);
  const tier = tiers.find((item) => totalKg > item.aboveKg);
  return tier?.cents ?? 0;
}

function isAfterHours(date: Date) {
  const parts = sydneyParts(date);
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return true;
  return parts.hour < 7 || parts.hour >= 18;
}

function isPublicHoliday(date: Date, input: QuoteInput, config: PricingConfig) {
  if (input.publicHoliday) return true;
  return config.publicHolidays.includes(sydneyParts(date).isoDate);
}

function transitEstimate(distance: DistanceResult, urban: boolean) {
  if (distance.kilometres == null) return null;
  if (distance.source === "unverified" || distance.source === "unresolved") return null;
  const speed = urban ? 32 : 78;
  const hours = distance.kilometres / speed;
  const rounded = hours < 1 ? `${Math.max(15, Math.round((hours * 60) / 5) * 5)} minutes` : `${hours.toFixed(1)} hours`;
  return `About ${rounded} of driving for this route. This is not a promised delivery time.`;
}

function priceService(
  service: ServiceRate,
  input: QuoteInput,
  distance: DistanceResult,
  config: PricingConfig,
  displayName: string,
  extraReasons: string[],
): ServiceQuote {
  const now = input.now ?? new Date();
  const reasons = [...extraReasons];
  const lines: PriceLine[] = [];
  const totalKg = input.packages * input.weightPerPackageKg;
  const { vehicle } = chooseVehicle(config, input);
  const holiday = isPublicHoliday(now, input, config);
  const urban = isSydneyZone(zoneForPostcode(input.pickupPostcode)) && isSydneyZone(zoneForPostcode(input.deliveryPostcode));

  if (service.code === "complex" || !vehicle) {
    if (!vehicle) reasons.push("The freight does not fit a configured vehicle, so dispatch needs to price it.");
    reasons.push("Final pricing depends on the route, goods, availability and deadline.");
    return {
      serviceCode: service.code,
      serviceName: displayName,
      vehicleCode: vehicle?.code ?? service.defaultVehicleCode,
      vehicleName: vehicle?.name ?? "To be confirmed",
      directDelivery: service.directDelivery,
      lines: [],
      subtotalCents: 0,
      gstCents: 0,
      totalCents: 0,
      gstLabel: config.gstRegistered ? (config.pricesIncludeGst ? "GST included" : "excluding GST") : "GST is not applicable",
      pricesIncludeGst: config.pricesIncludeGst,
      gstRegistered: config.gstRegistered,
      minimumApplied: false,
      calculated: false,
      status: "indicative",
      payable: false,
      reasons: unique(reasons),
      limitations: service.limitations,
      distanceKm: distance.kilometres,
      chargeableKm: chargeableKilometres(distance.kilometres),
      distanceSource: distance.source,
      distanceLabel: distance.label,
      collectionWindow: null,
      transitEstimate: null,
      expiresAt: new Date(now.getTime() + config.quoteExpiryHours * 3600_000).toISOString(),
      fromCents: service.indicativeFromCents,
    };
  }

  const km = chargeableKilometres(distance.kilometres);
  if (km == null || distance.source === "unresolved") {
    reasons.push("A road distance could not be calculated. Correct the addresses or ask for manual pricing.");
  }

  const distanceCents = km == null ? 0 : km * service.perKmCents;
  let core = service.baseFeeCents + distanceCents;
  const minimumApplied = core < service.minimumCents;
  if (minimumApplied) core = service.minimumCents;

  lines.push({ code: "base", description: "Base dispatch and handling", amountCents: service.baseFeeCents });
  if (km != null) {
    lines.push({
      code: "distance",
      description: `Distance ${km} km × ${formatRate(service.perKmCents)} (${distance.label})`,
      amountCents: distanceCents,
    });
  }
  if (minimumApplied) {
    lines.push({
      code: "minimum_adjustment",
      description: "Minimum service adjustment",
      amountCents: service.minimumCents - (service.baseFeeCents + (km == null ? 0 : distanceCents)),
    });
  }

  const extras: PriceLine[] = [];
  const heavy = heavyCents(config, totalKg);
  if (heavy > 0) {
    extras.push({ code: "heavy", description: `Heavy freight handling (${totalKg} kg)`, amountCents: heavy });
  }
  const longest = Math.max(input.lengthCm, input.widthCm, input.heightCm);
  if (longest > config.surcharges.oversizedMinCm) {
    extras.push({ code: "oversized", description: "Oversized freight", amountCents: config.surcharges.oversizedCents });
  }
  if (vehicle.surchargeCents > 0) {
    extras.push({
      code: "vehicle",
      description: `${vehicle.name} allowance`,
      amountCents: vehicle.surchargeCents,
    });
  } else if (input.tailLiftRequired) {
    extras.push({ code: "tail_lift", description: "Tail lift", amountCents: config.surcharges.tailLiftCents });
  }
  if (input.forkliftRequired) {
    extras.push({ code: "forklift", description: "Forklift at collection or delivery", amountCents: config.surcharges.forkliftCents });
    reasons.push("Forklift access has to be arranged before this job can be accepted.");
  }
  if (input.extraStops > 0) {
    extras.push({
      code: "extra_stop",
      description: `Additional stops × ${input.extraStops}`,
      amountCents: config.surcharges.extraStopCents * input.extraStops,
    });
  }
  const billableWait = Math.max(0, input.waitingMinutes - config.surcharges.waitingIncludedMinutes);
  if (billableWait > 0) {
    extras.push({
      code: "waiting",
      description: `Waiting time ${billableWait} min after ${config.surcharges.waitingIncludedMinutes} min included`,
      amountCents: billableWait * config.surcharges.waitingPerMinuteCents,
    });
  }
  if (input.tollsCents > 0) {
    extras.push({ code: "tolls", description: "Tolls advised for this route", amountCents: input.tollsCents });
  } else if (!config.allowAutoAcceptWithoutTolls) {
    reasons.push("Tolls are not included until the route is checked.");
  }
  const remote =
    config.remotePostcodes.includes(input.pickupPostcode) || config.remotePostcodes.includes(input.deliveryPostcode);
  if (remote) {
    extras.push({ code: "remote", description: "Remote-area access", amountCents: config.surcharges.remoteCents });
    reasons.push("Remote access has to be confirmed before the job can be accepted.");
  }
  if (input.fragile) {
    extras.push({ code: "fragile", description: "Fragile handling", amountCents: config.surcharges.fragileCents });
  }
  if (input.palletised) {
    extras.push({ code: "pallet", description: "Palletised freight", amountCents: config.surcharges.palletCents });
    reasons.push("Pallet loading needs a suitable vehicle and site access, which must be confirmed.");
  }
  if (input.loadingAssistance) {
    extras.push({
      code: "loading_assistance",
      description: "Loading assistance",
      amountCents: config.surcharges.loadingAssistanceCents,
    });
    reasons.push("Loading assistance has to be confirmed.");
  }
  if (holiday) {
    extras.push({
      code: "public_holiday",
      description: "Public holiday loading",
      amountCents: Math.round(core * config.surcharges.publicHolidayPercent),
    });
    reasons.push("Public holiday coverage is confirmed by dispatch before acceptance.");
  }
  if (input.dangerousGoods) {
    reasons.push("Dangerous goods are not accepted automatically. A compliant transport arrangement is required.");
  }
  if (input.goodsValueCents >= config.surcharges.highValueManualCents) {
    reasons.push("High-value freight needs written confirmation before it can be accepted.");
  }
  if (vehicle.specialist || input.tailLiftRequired) {
    reasons.push("A specialist vehicle has to be available before this price can be confirmed.");
  }
  if (distance.source !== "routing_api") {
    reasons.push("Road distance has not been verified from the street address to the street address.");
  }
  if (service.code === "interstate_hotshot") {
    reasons.push("Carrier cost, tolls, accommodation and return running still have to be checked.");
  }
  if (service.code === "overnight" || input.urgency === "overnight") {
    reasons.push("Overnight describes the request. It is not a guaranteed overnight delivery.");
  }
  if (input.urgency === "scheduled" || input.urgency === "deadline") {
    reasons.push("A future deadline is accepted only after dispatch confirms a vehicle can meet it.");
  }
  if (!isSydneyZone(zoneForPostcode(input.pickupPostcode)) || !isSydneyZone(zoneForPostcode(input.deliveryPostcode))) {
    if (service.code === "metro_express" || service.code === "after_hours") {
      reasons.push("This pickup or delivery sits outside the Sydney rate area.");
    }
  } else if (
    zoneForPostcode(input.pickupPostcode) !== "sydney_core" ||
    zoneForPostcode(input.deliveryPostcode) !== "sydney_core"
  ) {
    reasons.push("Greater Sydney jobs are confirmed before acceptance. Core metro rates are only an indication here.");
  }
  if (!config.autoAcceptEnabled || !service.autoAccept) {
    reasons.push("Dispatch confirms availability and the final price before you pay.");
  }

  const extraTotal = extras.reduce((sum, line) => sum + line.amountCents, 0);
  const subtotalBeforeGst = core + extraTotal;
  lines.push(...extras);
  const tax = applyGst(subtotalBeforeGst, config);
  const payable = reasons.length === 0 && km != null;
  const customerReasons = payable
    ? []
    : unique(reasons).filter((reason) => !reason.startsWith("Dispatch confirms availability"));

  return {
    serviceCode: service.code,
    serviceName: displayName,
    vehicleCode: vehicle.code,
    vehicleName: vehicle.name,
    directDelivery: service.directDelivery,
    lines,
    subtotalCents: tax.netCents,
    gstCents: tax.gstCents,
    totalCents: tax.totalCents,
    gstLabel: tax.gstLabel,
    pricesIncludeGst: config.pricesIncludeGst,
    gstRegistered: config.gstRegistered,
    minimumApplied,
    calculated: km != null,
    status: payable ? "confirmed" : "indicative",
    payable,
    reasons: payable ? [] : customerReasons.length ? customerReasons : ["Dispatch confirms availability and the final price before you pay."],
    limitations: service.limitations,
    distanceKm: distance.kilometres,
    chargeableKm: km,
    distanceSource: distance.source,
    distanceLabel: distance.label,
    collectionWindow: null,
    transitEstimate: transitEstimate(distance, urban),
    expiresAt: new Date(now.getTime() + config.quoteExpiryHours * 3600_000).toISOString(),
    fromCents: null,
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function formatRate(cents: number) {
  return `A$${(cents / 100).toFixed(2)}`;
}

export function priceQuote(input: QuoteInput, distance: DistanceResult, config: PricingConfig): QuoteResult {
  const category = input.category.trim().toLowerCase();
  if (PROHIBITED_CATEGORIES.has(category)) {
    return {
      options: [],
      blockedReason:
        "Those goods cannot be booked on this service. If you are unsure, contact dispatch before arranging transport.",
      assumptions: [],
      zoneNote: "",
    };
  }

  const pickupZone = zoneForPostcode(input.pickupPostcode);
  const deliveryZone = zoneForPostcode(input.deliveryPostcode);
  const pickupState = stateForPostcode(input.pickupPostcode);
  const deliveryState = stateForPostcode(input.deliveryPostcode);
  const now = input.now ?? new Date();
  const afterHours = isAfterHours(now);
  const bothSydney = isSydneyZone(pickupZone) && isSydneyZone(deliveryZone);
  const bothCore = pickupZone === "sydney_core" && deliveryZone === "sydney_core";
  const interstate =
    pickupState && deliveryState && pickupState !== deliveryState;
  const corridor = interstate && hotshotCorridor(pickupState, deliveryState);
  const regional =
    !bothSydney &&
    !interstate &&
    (pickupZone === "regional_nsw" || deliveryZone === "regional_nsw" || pickupState === "NSW");

  const assumptions = [
    "Prices use the current rate card. They are not a confirmed booking until the status says so.",
    "No collection window is shown unless a vehicle has actually been allocated.",
  ];
  if (input.weightPerPackageKg <= 0) assumptions.push("Weight was missing, so a price could not include a weight check.");

  const service = (code: ServiceRate["code"]) => config.services.find((item) => item.code === code)!;
  const options: ServiceQuote[] = [];
  const cannotFit = !chooseVehicle(config, input).vehicle;

  if (input.airCoordination || cannotFit || distance.source === "unresolved") {
    const reasons = [];
    if (input.airCoordination) {
      reasons.push("Next-flight coordination is quoted from airline and cartage availability. It is not priced from the road rate card.");
    }
    if (distance.source === "unresolved") {
      reasons.push("We could not resolve this route. Check the suburb and postcode, or ask dispatch to price it.");
    }
    options.push(priceService(service("complex"), input, distance, config, service("complex").name, reasons));
  } else if (bothSydney) {
    let code: ServiceRate["code"] = "metro_express";
    if (input.urgency === "overnight") code = "overnight";
    else if (afterHours) code = "after_hours";
    const selected = service(code);
    options.push(priceService(selected, input, distance, config, selected.name, []));
  } else if (corridor || regional) {
    const selected = service("interstate_hotshot");
    const name = interstate ? selected.name : "Dedicated regional delivery";
    const quote = priceService(selected, input, distance, config, name, [
      interstate
        ? "This interstate figure uses the dedicated hotshot rate card. It is an indication until a carrier quote is recorded."
        : "Regional NSW jobs use the dedicated rate card as an indication. Acceptance depends on a vehicle being available for that route.",
    ]);
    if (!interstate) {
      quote.limitations =
        "Regional coverage is arranged job by job. This is not a Sydney metro courier rate and it is not a confirmed price.";
    }
    options.push(quote);
  } else {
    options.push(
      priceService(service("complex"), input, distance, config, service("complex").name, [
        "This route is outside the Sydney, regional NSW and published interstate rate cards. Dispatch will price it if it can be arranged.",
      ]),
    );
  }

  const zoneNote = bothSydney
    ? bothCore
      ? "Both ends are in core Sydney."
      : "At least one end is in Greater Sydney, outside the core metro postcodes."
    : interstate
      ? "This is an interstate request. Time and price depend on a carrier being available."
      : regional
        ? "This is a regional NSW request and needs confirmation."
        : "This route is not on an automatically priced rate card.";

  return { options, assumptions, zoneNote };
}

function hotshotCorridor(a: string | null, b: string | null) {
  if (!a || !b) return false;
  const states = new Set([a, b]);
  const allowed = new Set(["NSW", "VIC", "QLD", "SA", "ACT"]);
  if (![...states].every((state) => allowed.has(state))) return false;
  return states.has("NSW") || states.has("ACT");
}

export function grossProfitCents(netRevenueCents: number, directCostExGstCents: number, paymentFeeCents = 0) {
  return netRevenueCents - directCostExGstCents - paymentFeeCents;
}

export function marginPercent(netRevenueCents: number, profitCents: number) {
  if (netRevenueCents <= 0) return null;
  return (profitCents / netRevenueCents) * 100;
}
