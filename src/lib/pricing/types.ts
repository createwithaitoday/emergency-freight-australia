export const SERVICE_CODES = [
  "metro_express",
  "after_hours",
  "overnight",
  "interstate_hotshot",
  "complex",
] as const;

export type ServiceCode = (typeof SERVICE_CODES)[number];

export const URGENCIES = [
  "asap",
  "within_2_hours",
  "within_4_hours",
  "today",
  "overnight",
  "deadline",
  "scheduled",
] as const;

export type Urgency = (typeof URGENCIES)[number];

export type DistanceSource =
  | "routing_api"
  | "postcode_route"
  | "known_route"
  | "unverified"
  | "unresolved";

export interface DistanceResult {
  kilometres: number | null;
  /** Original provider distance before rounding. Metres when the provider returns metres. */
  metres?: number | null;
  unit?: "m" | "km";
  provider?: string | null;
  calculatedAt?: string | null;
  source: DistanceSource;
  label: string;
}

export interface VehicleSpec {
  code: string;
  name: string;
  maxWeightKg: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  /** Extra charge above the rate-card vehicle. Not added twice with a matching handling fee. */
  surchargeCents: number;
  specialist: boolean;
}

export interface ServiceRate {
  code: ServiceCode;
  name: string;
  baseFeeCents: number;
  perKmCents: number;
  minimumCents: number;
  /** Shown on marketing pages. Not added again inside the calculator. */
  indicativeFromCents: number;
  autoAccept: boolean;
  directDelivery: boolean;
  defaultVehicleCode: string;
  summary: string;
  limitations: string;
}

export interface HeavyTier {
  aboveKg: number;
  cents: number;
}

export interface SurchargeConfig {
  extraStopCents: number;
  waitingPerMinuteCents: number;
  waitingIncludedMinutes: number;
  heavyTiers: HeavyTier[];
  oversizedCents: number;
  oversizedMinCm: number;
  tailLiftCents: number;
  forkliftCents: number;
  fragileCents: number;
  palletCents: number;
  remoteCents: number;
  loadingAssistanceCents: number;
  publicHolidayPercent: number;
  highValueManualCents: number;
}

export interface PricingConfig {
  currency: "AUD";
  gstRegistered: boolean;
  gstRate: number;
  pricesIncludeGst: boolean;
  quoteExpiryHours: number;
  autoAcceptEnabled: boolean;
  /** When false, customer quotes stay indicative until tolls are known. */
  allowAutoAcceptWithoutTolls: boolean;
  targetGrossMargin: number;
  /** Display-only. Not deducted inside job gross profit. */
  monthlyOverheadCents: number;
  /** Staff warning if an approved ex-GST price is below this. */
  minimumViableSellingCents: number;
  /** Round road distance up to the next whole kilometre, then apply this floor. */
  distanceRounding: "ceil_km";
  minChargeableKm: number;
  /** Dollar floor on estimated gross profit. Zero disables the dollar test. */
  minGrossProfitCents: number;
  /** Fraction, so 0.25 means 25 percent of ex-GST revenue. */
  minGrossMargin: number;
  maxDiscountPercent: number;
  /** Applied to the amount the customer pays, then deducted in the profit calculation. */
  paymentFeePercent: number;
  paymentFeeFixedCents: number;
  internalLabourCents: number;
  emergencySurchargeCents: number;
  /** Flat carrier allowance. Null means the carrier cost is unknown. */
  carrierAllowanceCents: number | null;
  /** Extra carrier cost per chargeable kilometre. Null means it is not approved. */
  carrierPerKmCents: number | null;
  /** Applied only to the per-kilometre carrier allowance on interstate jobs. */
  returnTripMultiplier: number;
  publicHolidays: string[];
  remotePostcodes: string[];
  services: ServiceRate[];
  vehicles: VehicleSpec[];
  surcharges: SurchargeConfig;
}

export interface QuoteInput {
  pickupPostcode: string;
  deliveryPostcode: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupSuburb?: string;
  deliverySuburb?: string;
  extraStops: number;
  urgency: Urgency;
  deadline?: string;
  category: string;
  packages: number;
  weightPerPackageKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  fragile: boolean;
  palletised: boolean;
  forkliftRequired: boolean;
  tailLiftRequired: boolean;
  loadingAssistance: boolean;
  dangerousGoods: boolean;
  goodsValueCents: number;
  vehicleCode?: string;
  waitingMinutes: number;
  tollsCents: number;
  airCoordination: boolean;
  publicHoliday: boolean;
  now?: Date;
}

export interface PriceLine {
  code: string;
  description: string;
  amountCents: number;
}

export interface ServiceQuote {
  serviceCode: ServiceCode;
  serviceName: string;
  vehicleCode: string;
  vehicleName: string;
  directDelivery: boolean;
  lines: PriceLine[];
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  gstLabel: string;
  pricesIncludeGst: boolean;
  gstRegistered: boolean;
  minimumApplied: boolean;
  /** True when the figure is a calculated total. False for an unpriced custom quote. */
  calculated: boolean;
  status: "indicative" | "confirmed";
  quoteState:
    | "indicative"
    | "awaiting_dispatch_review"
    | "awaiting_carrier_confirmation"
    | "confirmed";
  payable: boolean;
  estimatedDirectCostCents: number | null;
  estimatedProfitCents: number | null;
  estimatedMarginPercent: number | null;
  customerNotice: string;
  reasons: string[];
  limitations: string;
  distanceKm: number | null;
  chargeableKm: number | null;
  distanceSource: DistanceSource;
  distanceLabel: string;
  collectionWindow: string | null;
  transitEstimate: string | null;
  expiresAt: string;
  fromCents: number | null;
}

export interface QuoteResult {
  options: ServiceQuote[];
  blockedReason?: string;
  assumptions: string[];
  zoneNote: string;
}
