"use client";

import { useEffect, useMemo, useState } from "react";
import { track } from "@/components/analytics";
import { formatAud } from "@/lib/money";
import type { ServiceQuote } from "@/lib/pricing/types";

const steps = ["Route", "Urgency", "Freight", "Service", "Quote", "Book"];

const urgencies = [
  ["asap", "ASAP — immediate dispatch request"],
  ["within_2_hours", "Within 2 hours"],
  ["within_4_hours", "Within 4 hours"],
  ["today", "Today"],
  ["overnight", "Overnight"],
  ["deadline", "Specific delivery deadline"],
  ["scheduled", "Scheduled future delivery"],
] as const;

const categories = [
  ["general", "General commercial goods"],
  ["industrial_parts", "Industrial parts"],
  ["automotive_parts", "Automotive parts"],
  ["machinery_parts", "Machinery and equipment"],
  ["tools", "Tools"],
  ["documents", "Documents"],
  ["explosives", "Explosives (cannot be booked)"],
  ["firearms", "Firearms (cannot be booked)"],
  ["cash", "Cash (cannot be booked)"],
];

type Place = { suburb: string; postcode: string; state: string };

type QuoteResponse = {
  options: ServiceQuote[];
  blockedReason?: string;
  assumptions: string[];
  zoneNote: string;
  distance?: { label: string; source: string };
};

const initial = {
  pickupAddress: "",
  pickupSuburb: "",
  pickupPostcode: "",
  deliveryAddress: "",
  deliverySuburb: "",
  deliveryPostcode: "",
  extraStops: "0",
  urgency: "asap",
  deadline: "",
  category: "industrial_parts",
  description: "",
  packages: "1",
  weight: "8",
  length: "40",
  width: "30",
  height: "20",
  fragile: false,
  palletised: false,
  forklift: false,
  tailLift: false,
  loading: false,
  dangerous: false,
  dgDeclaration: "",
  value: "200",
  vehicle: "",
  air: false,
  holiday: false,
  serviceCode: "",
  name: "",
  business: "",
  email: "",
  phone: "",
  pickupContact: "",
  deliveryContact: "",
  access: "",
  po: "",
  special: "",
  terms: false,
  website: "",
};

export function DeliveryCalculator({
  variant = "page",
  preset,
}: {
  variant?: "hero" | "page";
  preset?: Partial<typeof initial>;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...initial, ...preset });
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeTarget, setPlaceTarget] = useState<"pickup" | "delivery" | null>(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const payload = useMemo(() => buildPayload(form), [form]);

  useEffect(() => {
    if (form.pickupPostcode.length !== 4 || form.deliveryPostcode.length !== 4) return;
    const handle = setTimeout(async () => {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (response.ok) {
        setQuote(body);
        setForm((current) => {
          if (current.serviceCode && body.options?.some((option: ServiceQuote) => option.serviceCode === current.serviceCode)) {
            return current;
          }
          return { ...current, serviceCode: body.options?.[0]?.serviceCode ?? "" };
        });
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [payload, form.pickupPostcode, form.deliveryPostcode]);

  const selected = quote?.options.find((option) => option.serviceCode === form.serviceCode) ?? quote?.options[0];

  function update(partial: Partial<typeof initial>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function searchPlaces(query: string, target: "pickup" | "delivery") {
    setPlaceTarget(target);
    if (query.trim().length < 2) {
      setPlaces([]);
      return;
    }
    const response = await fetch(`/api/places?q=${encodeURIComponent(query)}`);
    const body = await response.json();
    setPlaces(body.places ?? []);
  }

  function choosePlace(place: Place) {
    if (placeTarget === "pickup") update({ pickupSuburb: place.suburb, pickupPostcode: place.postcode });
    if (placeTarget === "delivery") update({ deliverySuburb: place.suburb, deliveryPostcode: place.postcode });
    setPlaces([]);
  }

  function next() {
    const problem = validateStep(step, form);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    if (step === 3) track("calculator_completed");
    setStep((value) => Math.min(5, value + 1));
  }

  async function submit(intent: "email" | "pay_estimate", provider?: "stripe" | "paypal") {
    const problem = validateStep(5, form);
    if (problem) {
      setError(problem);
      return;
    }
    if (intent === "pay_estimate" && !selected?.calculated) {
      setError("There is no calculated estimate to pay. Email the request and dispatch will price it.");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        serviceCode: form.serviceCode || selected?.serviceCode,
        idempotencyKey,
        contactName: form.name,
        businessName: form.business,
        email: form.email,
        phone: form.phone,
        pickupContact: form.pickupContact,
        deliveryContact: form.deliveryContact,
        accessInstructions: form.access,
        purchaseOrder: form.po,
        specialRequirements: form.special,
        termsAccepted: true,
        website: form.website,
        description: form.description,
        dgDeclaration: form.dgDeclaration,
        intent,
        utm: readUtm(),
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setBusy(false);
      setError(body.error || "The request could not be lodged.");
      return;
    }
    track(intent === "email" ? "quote_requested" : "payment_started", { status: body.status, ...(provider ? { provider } : {}) });
    if (intent === "email") {
      window.location.href = `/track/${body.trackingToken}`;
      return;
    }
    const payResponse = await fetch(provider === "paypal" ? "/api/payments/paypal" : "/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: body.trackingToken }),
    });
    const payBody = await payResponse.json();
    setBusy(false);
    if (payBody.url) {
      window.location.href = payBody.url;
      return;
    }
    setError(payBody.error || "Payment could not be started. The request is saved on the tracking page.");
    window.setTimeout(() => {
      window.location.href = `/track/${body.trackingToken}`;
    }, 1800);
  }

  return (
    <div className={variant === "hero" ? "rounded-3xl bg-white p-4 text-ink shadow-2xl sm:p-5" : "rounded-3xl border border-line bg-white p-4 sm:p-6"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange">24/7 request</p>
          <h2 className="font-display text-2xl leading-tight">Need It Delivered Now? We&apos;ll Get It Moving.</h2>
        </div>
        <p className="hidden text-right text-xs text-muted sm:block">Step {step + 1} of {steps.length}</p>
      </div>
      <ol className="mt-4 flex gap-1">
        {steps.map((label, index) => (
          <li key={label} className="flex-1">
            <button
              type="button"
              className={`h-1.5 w-full rounded-full ${index <= step ? "bg-orange" : "bg-line"}`}
              aria-label={label}
              onClick={() => index < step && setStep(index)}
            />
          </li>
        ))}
      </ol>
      <div className="mt-4 lg:max-h-[68vh] lg:overflow-auto lg:pr-1">
        {step === 0 && (
          <div className="grid gap-3">
            <Field label="Pickup address" value={form.pickupAddress} onChange={(value) => update({ pickupAddress: value })} autoComplete="street-address" />
            <Field label="Pickup suburb" value={form.pickupSuburb} onChange={(value) => { update({ pickupSuburb: value }); void searchPlaces(value, "pickup"); }} />
            <Field label="Pickup postcode" value={form.pickupPostcode} onChange={(value) => update({ pickupPostcode: value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" />
            <Field label="Delivery address" value={form.deliveryAddress} onChange={(value) => update({ deliveryAddress: value })} />
            <Field label="Delivery suburb" value={form.deliverySuburb} onChange={(value) => { update({ deliverySuburb: value }); void searchPlaces(value, "delivery"); }} />
            <Field label="Delivery postcode" value={form.deliveryPostcode} onChange={(value) => update({ deliveryPostcode: value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" />
            {places.length > 0 && (
              <ul className="overflow-hidden rounded-xl border border-line">
                {places.map((place) => (
                  <li key={`${place.suburb}-${place.postcode}`}>
                    <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => choosePlace(place)}>
                      {place.suburb} {place.postcode} · {place.state}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="text-sm font-semibold">
              Extra stops
              <input className="field mt-1" inputMode="numeric" value={form.extraStops} onChange={(event) => update({ extraStops: event.target.value })} />
            </label>
          </div>
        )}
        {step === 1 && (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold">When does it need to move?</legend>
            {urgencies.map(([value, label]) => (
              <label key={value} className="flex items-start gap-3 rounded-xl border border-line px-3 py-3 text-sm">
                <input type="radio" name="urgency" checked={form.urgency === value} onChange={() => update({ urgency: value })} />
                <span>{label}</span>
              </label>
            ))}
            {(form.urgency === "deadline" || form.urgency === "scheduled") && (
              <label className="text-sm font-semibold">
                Deadline
                <input className="field mt-1" type="datetime-local" value={form.deadline} onChange={(event) => update({ deadline: event.target.value })} />
              </label>
            )}
            <p className="text-xs leading-5 text-muted">These options describe what you need. They are not guaranteed service levels.</p>
          </fieldset>
        )}
        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">
              Item description
              <input className="field mt-1" value={form.description} onChange={(event) => update({ description: event.target.value })} />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Freight category
              <select className="field mt-1" value={form.category} onChange={(event) => update({ category: event.target.value })}>
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <Field label="Packages" value={form.packages} onChange={(value) => update({ packages: value })} inputMode="numeric" />
            <Field label="Weight per package (kg)" value={form.weight} onChange={(value) => update({ weight: value })} inputMode="decimal" />
            <Field label="Length (cm)" value={form.length} onChange={(value) => update({ length: value })} inputMode="decimal" />
            <Field label="Width (cm)" value={form.width} onChange={(value) => update({ width: value })} inputMode="decimal" />
            <Field label="Height (cm)" value={form.height} onChange={(value) => update({ height: value })} inputMode="decimal" />
            <label className="text-sm font-semibold">
              Vehicle, if you need a specific one
              <select className="field mt-1" value={form.vehicle} onChange={(event) => update({ vehicle: event.target.value })}>
                <option value="">Best fit</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="ute">Ute</option>
                <option value="tail_lift">Tail-lift truck</option>
                <option value="pantech">Pantech</option>
              </select>
            </label>
            <Check label="Fragile" checked={form.fragile} onChange={(fragile) => update({ fragile })} />
            <Check label="Palletised" checked={form.palletised} onChange={(palletised) => update({ palletised })} />
            <Check label="Forklift required" checked={form.forklift} onChange={(forklift) => update({ forklift })} />
            <Check label="Tail lift required" checked={form.tailLift} onChange={(tailLift) => update({ tailLift })} />
            <Check label="Loading assistance" checked={form.loading} onChange={(loading) => update({ loading })} />
            <Check label="Public holiday" checked={form.holiday} onChange={(holiday) => update({ holiday })} />
            <Check label="Next-flight coordination" checked={form.air} onChange={(air) => update({ air })} />
            <Check label="Dangerous goods" checked={form.dangerous} onChange={(dangerous) => update({ dangerous })} />
            <label className="text-sm font-semibold sm:col-span-2">
              Value of goods (AUD)
              <input className="field mt-1" inputMode="decimal" value={form.value} onChange={(event) => update({ value: event.target.value })} />
            </label>
            {form.dangerous && (
              <label className="text-sm font-semibold sm:col-span-2">
                Dangerous goods declaration
                <textarea className="field mt-1" rows={3} value={form.dgDeclaration} onChange={(event) => update({ dgDeclaration: event.target.value })} />
              </label>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-3">
            {quote?.blockedReason && <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800">{quote.blockedReason}</p>}
            {quote?.options.map((option) => (
              <label key={option.serviceCode + option.serviceName} className={`block rounded-2xl border p-4 ${form.serviceCode === option.serviceCode ? "border-orange" : "border-line"}`}>
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <input type="radio" className="mr-2" checked={form.serviceCode === option.serviceCode} onChange={() => update({ serviceCode: option.serviceCode })} />
                    <span className="font-semibold">{option.serviceName}</span>
                  </span>
                  <span className="text-right font-display text-xl">
                    {option.calculated ? formatAud(option.totalCents) : `From ${formatAud(option.fromCents ?? 0)}`}
                  </span>
                </span>
                <span className="mt-2 block text-xs uppercase tracking-wide text-orange">{option.payable ? "Confirmed booking price" : "Indicative estimate"}</span>
                <span className="mt-2 block text-sm text-muted">{option.vehicleName} · {option.directDelivery ? "Direct delivery" : "Consolidated transport"}</span>
                <span className="mt-1 block text-sm text-muted">Collection window: {option.collectionWindow ?? "Confirmed only after a vehicle is allocated."}</span>
                {option.transitEstimate && <span className="mt-1 block text-sm text-muted">{option.transitEstimate}</span>}
                <span className="mt-1 block text-sm text-muted">{option.limitations}</span>
              </label>
            ))}
          </div>
        )}
        {step === 4 && selected && (
          <QuoteSummary option={selected} zoneNote={quote?.zoneNote} />
        )}
        {step === 5 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name" value={form.name} onChange={(value) => update({ name: value })} autoComplete="name" />
            <Field label="Business name" value={form.business} onChange={(value) => update({ business: value })} />
            <Field label="Email" value={form.email} onChange={(value) => update({ email: value })} autoComplete="email" />
            <Field label="Phone" value={form.phone} onChange={(value) => update({ phone: value })} autoComplete="tel" />
            <Field label="Pickup contact" value={form.pickupContact} onChange={(value) => update({ pickupContact: value })} />
            <Field label="Delivery contact" value={form.deliveryContact} onChange={(value) => update({ deliveryContact: value })} />
            <label className="text-sm font-semibold sm:col-span-2">
              Access instructions
              <textarea className="field mt-1" rows={2} value={form.access} onChange={(event) => update({ access: event.target.value })} />
            </label>
            <Field label="Purchase order" value={form.po} onChange={(value) => update({ po: value })} />
            <Field label="Special requirements" value={form.special} onChange={(value) => update({ special: value })} />
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.terms} onChange={(event) => update({ terms: event.target.checked })} />
              <span>I accept the <a className="underline" href="/legal/terms">terms</a>, including that an indicative price is not a confirmed booking.</span>
            </label>
            {selected?.calculated && (
              <p className="rounded-xl bg-paper px-3 py-3 text-sm sm:col-span-2">
                Estimated total {formatAud(selected.totalCents)} {selected.gstRegistered ? `including GST of ${formatAud(selected.gstCents)}` : selected.gstLabel}. Paying this estimate does not confirm a vehicle. Dispatch still checks availability and any extra charge.
              </p>
            )}
            <label className="absolute left-[-9999px]" aria-hidden="true">
              Website
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update({ website: event.target.value })} />
            </label>
          </div>
        )}
      </div>
      {selected && step < 4 && (
        <div className="mt-4 rounded-2xl bg-paper px-3 py-3" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{selected.payable ? "Confirmed booking price" : selected.serviceCode === "interstate_hotshot" ? "Indicative only — confirmation required" : "Indicative estimate"}</p>
          <p className="font-display text-2xl">{selected.calculated ? formatAud(selected.totalCents) : `From ${formatAud(selected.fromCents ?? 0)}`}</p>
          <p className="text-xs text-muted">Ex GST {selected.calculated ? formatAud(selected.subtotalCents) : "to be confirmed"}. {selected.gstRegistered ? `${selected.gstLabel}. GST ${formatAud(selected.gstCents)}. Total ${formatAud(selected.totalCents)}.` : selected.gstLabel} {selected.distanceLabel}</p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {step > 0 && <button type="button" className="rounded-xl border border-line px-4 py-3 font-semibold" onClick={() => setStep((value) => value - 1)}>Back</button>}
        {step < 5 && <button type="button" className="btn-orange" onClick={next}>Calculate my price</button>}
        {step < 5 && (
          <button
            type="button"
            className="rounded-xl border border-navy-900 px-4 py-3 font-semibold"
            onClick={() => {
              update({ urgency: "asap" });
              setStep((value) => Math.max(value, Math.min(5, value + 1)));
            }}
          >
            Request immediate dispatch
          </button>
        )}
        {step === 5 && (
          <>
            <button type="button" className="btn-orange" disabled={busy || !selected?.calculated} onClick={() => void submit("pay_estimate", "stripe")}>
              {busy ? "Sending…" : "Pay estimated price by card"}
            </button>
            <button type="button" className="rounded-xl border border-navy-900 px-4 py-3 font-semibold" disabled={busy || !selected?.calculated} onClick={() => void submit("pay_estimate", "paypal")}>
              Pay estimated price with PayPal
            </button>
            <button type="button" className="rounded-xl border border-line px-4 py-3 font-semibold sm:col-span-2" disabled={busy} onClick={() => void submit("email")}>
              Email this request
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function QuoteSummary({ option, zoneNote }: { option: ServiceQuote; zoneNote?: string }) {
  return (
    <div className="text-sm leading-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange">{option.payable ? "Confirmed booking price" : "Indicative estimate"}</p>
      <p className="mt-1 font-display text-3xl">{option.calculated ? formatAud(option.totalCents) : `From ${formatAud(option.fromCents ?? 0)}`}</p>
      <p className="text-muted">{option.serviceName} · {option.vehicleName}</p>
      <p className="text-muted">{zoneNote}</p>
      <p className="text-muted">Distance basis: {option.distanceLabel}{option.chargeableKm ? ` · ${option.chargeableKm} chargeable km` : ""}</p>
      {option.lines.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {option.lines.map((line) => (
            <li key={line.code} className="flex justify-between gap-3 py-2">
              <span>{line.description}</span>
              <span>{formatAud(line.amountCents)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3">GST: {option.gstRegistered ? formatAud(option.gstCents) : "Not applicable"} · {option.gstLabel}</p>
      <p>Total payable: {option.calculated ? formatAud(option.totalCents) : "Set after dispatch prices the job"}</p>
      <p>Quote expiry: {new Date(option.expiresAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</p>
      <p>Availability: {option.collectionWindow ?? "Awaiting availability confirmation"}</p>
      <p className="mt-3 text-muted">{option.customerNotice}</p>
      <ul className="mt-2 list-disc pl-4 text-muted">
        {option.reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
    </div>
  );
}

function Field({ label, value, onChange, inputMode, autoComplete }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "numeric" | "decimal"; autoComplete?: string }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input className="field mt-1" value={value} inputMode={inputMode} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function buildPayload(form: typeof initial) {
  return {
    pickupAddress: form.pickupAddress,
    deliveryAddress: form.deliveryAddress,
    pickupSuburb: form.pickupSuburb,
    deliverySuburb: form.deliverySuburb,
    pickupPostcode: form.pickupPostcode,
    deliveryPostcode: form.deliveryPostcode,
    extraStops: Number(form.extraStops || 0),
    urgency: form.urgency,
    deadline: form.deadline,
    category: form.category,
    description: form.description,
    packages: Number(form.packages || 1),
    weightPerPackageKg: Number(form.weight || 0),
    lengthCm: Number(form.length || 0),
    widthCm: Number(form.width || 0),
    heightCm: Number(form.height || 0),
    fragile: form.fragile,
    palletised: form.palletised,
    forkliftRequired: form.forklift,
    tailLiftRequired: form.tailLift,
    loadingAssistance: form.loading,
    dangerousGoods: form.dangerous,
    dgDeclaration: form.dgDeclaration,
    goodsValueCents: Math.round(Number(form.value || 0) * 100),
    vehicleCode: form.vehicle,
    waitingMinutes: 0,
    tollsCents: 0,
    airCoordination: form.air,
    publicHoliday: form.holiday,
  };
}

function validateStep(step: number, form: typeof initial) {
  if (step === 0 && (form.pickupPostcode.length !== 4 || form.deliveryPostcode.length !== 4 || form.pickupAddress.length < 3 || form.deliveryAddress.length < 3)) {
    return "Enter both street addresses and four-digit postcodes.";
  }
  if (step === 1 && (form.urgency === "deadline" || form.urgency === "scheduled") && !form.deadline) {
    return "Enter the deadline you need.";
  }
  if (step === 2) {
    if (form.description.trim().length < 3) return "Describe the freight.";
    if (Number(form.weight) <= 0 || Number(form.length) <= 0) return "Enter the weight and dimensions.";
    if (form.dangerous && form.dgDeclaration.trim().length < 8) return "Dangerous goods need a short declaration.";
  }
  if (step === 5) {
    if (form.name.trim().length < 2 || !form.email.includes("@") || form.phone.trim().length < 8) return "Enter a name, email and phone number.";
    if (!form.terms) return "Accept the terms to lodge the request.";
    if (form.website) return "The request could not be lodged.";
  }
  return "";
}

function readUtm() {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "gclid"]) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}
