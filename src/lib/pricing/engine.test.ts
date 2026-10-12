import { describe, expect, it } from "vitest";
import { defaultPricing } from "@/lib/pricing/defaults";
import {
  applyGst,
  chargeableKilometres,
  grossProfitCents,
  marginPercent,
  priceQuote,
  zoneForPostcode,
} from "@/lib/pricing/engine";
import type { DistanceResult, PricingConfig, QuoteInput } from "@/lib/pricing/types";

const weekday = new Date("2026-06-15T00:30:00.000Z");
const saturday = new Date("2026-06-13T02:00:00.000Z");
const evening = new Date("2026-06-15T09:30:00.000Z");

function input(overrides: Partial<QuoteInput> = {}): QuoteInput {
  return {
    pickupPostcode: "2000",
    deliveryPostcode: "2020",
    pickupSuburb: "Sydney",
    deliverySuburb: "Mascot",
    extraStops: 0,
    urgency: "asap",
    category: "industrial_parts",
    packages: 1,
    weightPerPackageKg: 8,
    lengthCm: 40,
    widthCm: 30,
    heightCm: 20,
    fragile: false,
    palletised: false,
    forkliftRequired: false,
    tailLiftRequired: false,
    loadingAssistance: false,
    dangerousGoods: false,
    goodsValueCents: 20000,
    waitingMinutes: 0,
    tollsCents: 0,
    airCoordination: false,
    publicHoliday: false,
    now: weekday,
    ...overrides,
  };
}

function distance(overrides: Partial<DistanceResult> = {}): DistanceResult {
  return {
    kilometres: 8.2,
    source: "routing_api",
    label: "driving distance from the routing provider",
    ...overrides,
  };
}

function openConfig(overrides: Partial<PricingConfig> = {}): PricingConfig {
  return {
    ...defaultPricing,
    autoAcceptEnabled: true,
    allowAutoAcceptWithoutTolls: true,
    services: defaultPricing.services.map((service) => ({ ...service })),
    vehicles: defaultPricing.vehicles.map((vehicle) => ({ ...vehicle })),
    surcharges: { ...defaultPricing.surcharges, heavyTiers: defaultPricing.surcharges.heavyTiers.map((tier) => ({ ...tier })) },
    ...overrides,
  };
}

describe("pricing engine", () => {
  it("applies the Sydney metro minimum on a short verified trip", () => {
    const quote = priceQuote(input(), distance(), openConfig());
    const option = quote.options[0];
    expect(option.serviceCode).toBe("metro_express");
    expect(option.chargeableKm).toBe(9);
    expect(option.minimumApplied).toBe(true);
    expect(option.subtotalCents).toBe(14900);
    expect(option.gstCents).toBe(1490);
    expect(option.totalCents).toBe(16390);
    expect(option.gstLabel).toBe("excluding GST");
    expect(option.payable).toBe(true);
    expect(option.status).toBe("confirmed");
    expect(option.collectionWindow).toBeNull();
  });

  it("charges per kilometre once the trip is above the minimum", () => {
    const quote = priceQuote(input(), distance({ kilometres: 40 }), openConfig());
    const option = quote.options[0];
    expect(option.minimumApplied).toBe(false);
    expect(option.subtotalCents).toBe(9900 + 40 * 250);
    expect(option.lines.find((line) => line.code === "distance")?.amountCents).toBe(10000);
  });

  it("adds an extra stop after the minimum, without swallowing it", () => {
    const quote = priceQuote(input({ extraStops: 1 }), distance(), openConfig());
    const option = quote.options[0];
    expect(option.lines.find((line) => line.code === "extra_stop")?.amountCents).toBe(6500);
    expect(option.subtotalCents).toBe(14900 + 6500);
  });

  it("uses one heavy-freight tier and does not stack them", () => {
    const quote = priceQuote(input({ weightPerPackageKg: 120 }), distance({ kilometres: 40 }), openConfig());
    const heavy = quote.options[0].lines.filter((line) => line.code === "heavy");
    expect(heavy).toHaveLength(1);
    expect(heavy[0].amountCents).toBe(4500);
  });

  it("does not add an out-of-hours surcharge on top of the after-hours rate", () => {
    const quote = priceQuote(input({ now: saturday }), distance(), openConfig());
    const option = quote.options[0];
    expect(option.serviceCode).toBe("after_hours");
    expect(option.lines.some((line) => line.code === "out_of_hours")).toBe(false);
    expect(option.subtotalCents).toBe(24900);
  });

  it("uses the after-hours card on a weekday evening", () => {
    const quote = priceQuote(input({ now: evening }), distance(), openConfig());
    expect(quote.options[0].serviceCode).toBe("after_hours");
  });

  it("prices a public holiday loading on the daytime metro card", () => {
    const quote = priceQuote(input({ publicHoliday: true }), distance({ kilometres: 40 }), openConfig());
    const option = quote.options[0];
    expect(option.serviceCode).toBe("metro_express");
    const holiday = option.lines.find((line) => line.code === "public_holiday");
    expect(holiday?.amountCents).toBe(Math.round(19900 * 0.35));
    expect(option.payable).toBe(false);
  });

  it("keeps an unverified distance indicative", () => {
    const quote = priceQuote(
      input(),
      distance({ source: "unverified", label: "estimate" }),
      openConfig(),
    );
    expect(quote.options[0].status).toBe("indicative");
    expect(quote.options[0].payable).toBe(false);
    expect(quote.options[0].transitEstimate).toBeNull();
  });

  it("does not auto-accept interstate hotshot even when the switch is on", () => {
    const quote = priceQuote(
      input({ pickupPostcode: "2000", deliveryPostcode: "3000", pickupSuburb: "Sydney", deliverySuburb: "Melbourne" }),
      distance({ kilometres: 878, source: "known_route", label: "capital road distance" }),
      openConfig(),
    );
    const option = quote.options[0];
    expect(option.serviceCode).toBe("interstate_hotshot");
    expect(option.subtotalCents).toBe(29900 + 878 * 250);
    expect(option.payable).toBe(false);
    expect(option.status).toBe("indicative");
  });

  it("sends dangerous goods to review without accepting payment", () => {
    const quote = priceQuote(input({ dangerousGoods: true }), distance(), openConfig());
    expect(quote.options[0].payable).toBe(false);
    expect(quote.options[0].reasons.join(" ")).toMatch(/Dangerous goods/i);
  });

  it("blocks prohibited freight before a price is shown", () => {
    const quote = priceQuote(input({ category: "explosives" }), distance(), openConfig());
    expect(quote.options).toHaveLength(0);
    expect(quote.blockedReason).toMatch(/cannot be booked/i);
  });

  it("does not invent a calculated price for an unresolved route", () => {
    const quote = priceQuote(input({ deliveryPostcode: "9999" }), distance({ kilometres: null, source: "unresolved" }), openConfig());
    expect(quote.options[0].serviceCode).toBe("complex");
    expect(quote.options[0].calculated).toBe(false);
    expect(quote.options[0].payable).toBe(false);
    expect(quote.options[0].fromCents).toBe(150000);
  });

  it("prices next-flight requests as a custom quote", () => {
    const quote = priceQuote(input({ airCoordination: true }), distance(), openConfig());
    expect(quote.options[0].serviceCode).toBe("complex");
    expect(quote.options[0].calculated).toBe(false);
  });

  it("leaves the default configuration indicative until auto-accept is enabled", () => {
    const quote = priceQuote(input(), distance(), defaultPricing);
    expect(quote.options[0].payable).toBe(false);
    expect(quote.options[0].status).toBe("indicative");
  });

  it("calculates GST inclusive prices without adding tax twice", () => {
    const config = openConfig({ pricesIncludeGst: true });
    const tax = applyGst(14900, config);
    expect(tax.totalCents).toBe(14900);
    expect(tax.gstCents).toBe(14900 - tax.netCents);
    expect(tax.gstLabel).toBe("GST included");
  });

  it("omits GST when the business is not registered", () => {
    const quote = priceQuote(input(), distance(), openConfig({ gstRegistered: false }));
    expect(quote.options[0].gstCents).toBe(0);
    expect(quote.options[0].totalCents).toBe(14900);
    expect(quote.options[0].gstLabel).toMatch(/not applicable/i);
  });

  it("sets a quote expiry in the future", () => {
    const quote = priceQuote(input(), distance(), openConfig());
    expect(new Date(quote.options[0].expiresAt).getTime()).toBeGreaterThan(weekday.getTime());
  });

  it("classifies Sydney and interstate postcodes", () => {
    expect(zoneForPostcode("2000")).toBe("sydney_core");
    expect(zoneForPostcode("2750")).toBe("sydney_greater");
    expect(zoneForPostcode("2500")).toBe("regional_nsw");
    expect(zoneForPostcode("3000")).toBe("interstate");
  });

  it("rounds chargeable kilometres up, with a one kilometre floor", () => {
    expect(chargeableKilometres(8.1)).toBe(9);
    expect(chargeableKilometres(0)).toBe(1);
    expect(chargeableKilometres(null)).toBeNull();
  });
});

describe("job margin", () => {
  it("calculates gross profit from ex-GST revenue and ex-GST direct cost", () => {
    const profit = grossProfitCents(19900, 12000, 500);
    expect(profit).toBe(7400);
    expect(marginPercent(19900, profit)).toBeCloseTo(37.1859, 3);
  });
});
