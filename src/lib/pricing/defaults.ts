import type { PricingConfig } from "@/lib/pricing/types";

/**
 * Launch assumptions for testing. These are not verified carrier buy-rates
 * and are not a promise that a job can be accepted at this price.
 * Change them in the admin pricing screen. The calculator reads that copy.
 */
export const defaultPricing: PricingConfig = {
  currency: "AUD",
  gstRegistered: true,
  gstRate: 0.1,
  pricesIncludeGst: false,
  quoteExpiryHours: 4,
  autoAcceptEnabled: false,
  allowAutoAcceptWithoutTolls: false,
  targetGrossMargin: 0.25,
  monthlyOverheadCents: 0,
  minimumViableSellingCents: 14900,
  publicHolidays: [
    "2026-01-01",
    "2026-01-26",
    "2026-04-03",
    "2026-04-06",
    "2026-04-25",
    "2026-12-25",
    "2026-12-26",
  ],
  remotePostcodes: ["2880", "2840", "2898", "2899"],
  services: [
    {
      code: "metro_express",
      name: "Sydney Metro Express",
      baseFeeCents: 9900,
      perKmCents: 250,
      minimumCents: 14900,
      indicativeFromCents: 14900,
      autoAccept: true,
      directDelivery: true,
      defaultVehicleCode: "van",
      summary: "Dedicated Sydney pickup and direct delivery during ordinary dispatch hours.",
      limitations:
        "Availability is not guaranteed. The collection time is confirmed only after a vehicle is allocated. This rate does not include tolls.",
    },
    {
      code: "after_hours",
      name: "After-Hours Express",
      baseFeeCents: 17900,
      perKmCents: 300,
      minimumCents: 24900,
      indicativeFromCents: 24900,
      autoAccept: true,
      directDelivery: true,
      defaultVehicleCode: "van",
      summary:
        "For requests lodged after hours, overnight as a request, or across a weekend. Out-of-hours handling is included in this rate.",
      limitations:
        "An after-hours request is not a guaranteed collection time. Public holiday loadings are additional. Tolls are not included.",
    },
    {
      code: "overnight",
      name: "Overnight Priority",
      baseFeeCents: 24900,
      perKmCents: 350,
      minimumCents: 34900,
      indicativeFromCents: 34900,
      autoAccept: false,
      directDelivery: true,
      defaultVehicleCode: "van",
      summary:
        "An overnight request for priority handling. It is not a guarantee that the goods will be delivered overnight.",
      limitations:
        "Transit depends on the route, driver hours and road conditions. This service cannot be accepted automatically.",
    },
    {
      code: "interstate_hotshot",
      name: "Interstate Dedicated Hotshot",
      baseFeeCents: 29900,
      perKmCents: 250,
      minimumCents: 79900,
      indicativeFromCents: 79900,
      autoAccept: false,
      directDelivery: true,
      defaultVehicleCode: "van",
      summary:
        "A dedicated vehicle for urgent interstate or regional road freight. The figure is a pricing model, not a carrier quote.",
      limitations:
        "Tolls, driver accommodation, return running and the carrier's actual cost are added when they apply. Do not treat this as a confirmed rate until dispatch checks it.",
    },
    {
      code: "complex",
      name: "Complex Emergency Freight",
      baseFeeCents: 0,
      perKmCents: 0,
      minimumCents: 150000,
      indicativeFromCents: 150000,
      autoAccept: false,
      directDelivery: true,
      defaultVehicleCode: "van",
      summary:
        "For urgent deliveries requiring specialised vehicles, long-distance coordination, unusual operating hours or complex transport arrangements. Final pricing depends on the route, goods, availability and deadline.",
      limitations:
        "Jobs in this category are quoted by dispatch. The starting figure is not a calculated price for your route.",
    },
  ],
  vehicles: [
    {
      code: "car",
      name: "Car",
      maxWeightKg: 40,
      maxLengthCm: 100,
      maxWidthCm: 60,
      maxHeightCm: 50,
      surchargeCents: 0,
      specialist: false,
    },
    {
      code: "van",
      name: "Van",
      maxWeightKg: 800,
      maxLengthCm: 240,
      maxWidthCm: 140,
      maxHeightCm: 150,
      surchargeCents: 0,
      specialist: false,
    },
    {
      code: "ute",
      name: "Ute",
      maxWeightKg: 1000,
      maxLengthCm: 180,
      maxWidthCm: 150,
      maxHeightCm: 40,
      surchargeCents: 4000,
      specialist: false,
    },
    {
      code: "tail_lift",
      name: "Tail-lift truck",
      maxWeightKg: 2000,
      maxLengthCm: 410,
      maxWidthCm: 210,
      maxHeightCm: 210,
      surchargeCents: 18000,
      specialist: true,
    },
    {
      code: "pantech",
      name: "Pantech",
      maxWeightKg: 4000,
      maxLengthCm: 610,
      maxWidthCm: 240,
      maxHeightCm: 220,
      surchargeCents: 35000,
      specialist: true,
    },
  ],
  surcharges: {
    extraStopCents: 6500,
    waitingPerMinuteCents: 150,
    waitingIncludedMinutes: 15,
    heavyTiers: [
      { aboveKg: 500, cents: 9000 },
      { aboveKg: 100, cents: 4500 },
      { aboveKg: 30, cents: 2000 },
    ],
    oversizedCents: 3500,
    oversizedMinCm: 120,
    tailLiftCents: 8500,
    forkliftCents: 12000,
    fragileCents: 2500,
    palletCents: 4500,
    remoteCents: 15000,
    loadingAssistanceCents: 3500,
    publicHolidayPercent: 0.35,
    highValueManualCents: 500000,
  },
};

export function serviceByCode(config: PricingConfig, code: string) {
  return config.services.find((service) => service.code === code);
}
