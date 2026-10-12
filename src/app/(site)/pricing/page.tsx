import type { Metadata } from "next";
import { getStoredPricing } from "@/lib/db/repo";
import { defaultPricing } from "@/lib/pricing/defaults";
import { formatAud } from "@/lib/money";

export const metadata: Metadata = {
  title: "Pricing",
  description: "How indicative delivery prices differ from confirmed booking prices, and what can change the total.",
  alternates: { canonical: "/pricing" },
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const pricing = await getStoredPricing().catch(() => defaultPricing);
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 leading-7">
      <h1 className="font-display text-5xl">Pricing transparency</h1>
      <p className="mt-4">An indicative estimate is a calculation from the current rate card. It is not a promise that a vehicle is free or that the figure is the amount you will pay. A confirmed booking price is one dispatch has authorised, and it is the only kind of price the site will take payment for.</p>
      <p className="mt-4">The preliminary price is the base fee plus chargeable kilometres, raised to the service minimum if that result is lower, then plus extras. Extras are additional stops, weight, size, a specialist vehicle, waiting time, tolls, remote access, a public holiday, special handling, or a carrier or air-freight cost. A cost already inside the base rate is not added again. After-hours handling lives inside the after-hours card, so it is not charged a second time.</p>
      <p className="mt-4">{pricing.gstRegistered ? `This business is configured as GST registered. Prices on the rate card are ${pricing.pricesIncludeGst ? "GST inclusive" : "GST exclusive"}, and the checkout total follows that setting.` : "GST is not being added because the business is configured as not registered."} Job profit in the admin report is revenue excluding GST, minus the direct delivery cost excluding recoverable GST. Fixed overheads are shown separately and are not buried in the job.</p>
      <h2 className="mt-8 font-display text-3xl">Why a job becomes a custom quote</h2>
      <ul className="mt-3 list-disc pl-5">
        <li>The street-to-street distance has not been checked.</li>
        <li>The freight is dangerous, high value, palletised, or needs a specialist vehicle.</li>
        <li>The route is interstate, regional, remote, or not on a rate card.</li>
        <li>Tolls, a return trip or a carrier’s buy rate are still unknown.</li>
        <li>Automatic acceptance is switched off until the rate card has been checked against real carrier quotes.</li>
      </ul>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-line"><th className="py-2">Service</th><th>Base</th><th>Per km</th><th>Minimum</th></tr></thead>
          <tbody>
            {pricing.services.map((service) => (
              <tr key={service.code} className="border-b border-line">
                <td className="py-2 pr-3">{service.name}</td>
                <td>{formatAud(service.baseFeeCents)}</td>
                <td>{formatAud(service.perKmCents)}</td>
                <td>{formatAud(service.minimumCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">These are the live rate-card figures. They are launch assumptions until a carrier quote says otherwise. Complex freight shows a starting figure, not a calculated route price.</p>
    </article>
  );
}
