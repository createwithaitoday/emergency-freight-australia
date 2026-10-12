import Link from "next/link";
import { DeliveryCalculator } from "@/components/delivery-calculator";
import { FaqList } from "@/components/faq-list";
import { brand } from "@/lib/brand";
import { faqs, industries, locations, services } from "@/lib/content";
import { getStoredPricing } from "@/lib/db/repo";
import { formatAud } from "@/lib/money";
import { defaultPricing } from "@/lib/pricing/defaults";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const pricing = await getStoredPricing().catch(() => defaultPricing);
  const cards = ["metro_express", "after_hours", "overnight", "interstate_hotshot", "complex"]
    .map((code) => pricing.services.find((service) => service.code === code))
    .filter((service) => service != null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: brand.name,
    description: brand.supporting,
    telephone: brand.phoneDisplay,
    email: brand.email,
    url: brand.url,
    areaServed: "AU",
    image: `${brand.url}/images/hero-night-dispatch.jpg`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative isolate overflow-hidden bg-navy-950 text-white">
        <img src="/images/hero-night-dispatch.jpg" alt="Night dispatch van at a Sydney dock with the Harbour Bridge behind it." className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-navy-950/45" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange">{brand.positioning}</p>
            <h1 className="mt-3 max-w-xl font-display text-5xl leading-[0.95] sm:text-6xl">{brand.heroHeadline}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">{brand.heroDescription}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#calculate" className="btn-orange">{brand.primaryCta}</a>
              <a href="#calculate" className="btn-ghost">{brand.secondaryCta}</a>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-white/80 sm:grid-cols-2">
              {[
                "Online booking available 24/7",
                "Dedicated delivery options",
                "After-hours and weekend requests",
                "Interstate and regional coordination",
                "Transparent pricing before payment",
                "Delivery updates and proof of delivery",
              ].map((item) => (
                <li key={item} className="rounded-full border border-white/15 px-3 py-2">{item}</li>
              ))}
            </ul>
          </div>
          <div id="calculate">
            <DeliveryCalculator variant="hero" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange">How it works</p>
        <h2 className="mt-2 font-display text-4xl">Five steps. A person still checks the hard jobs.</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ["01", "Enter pickup and delivery details."],
            ["02", "Calculate your indicative delivery price."],
            ["03", "Confirm availability and transport requirements."],
            ["04", "Pay securely when the booking is accepted."],
            ["05", "Receive dispatch updates and proof of delivery."],
          ].map(([number, copy]) => (
            <li key={number} className="rounded-2xl border border-line bg-white p-4">
              <p className="font-display text-2xl text-orange">{number}</p>
              <p className="mt-2 text-sm leading-6">{copy}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
          Some bookings need a dispatcher to confirm a vehicle, a carrier cost or a deadline before they can be accepted. You will see “Awaiting availability confirmation” until that happens. Payment is only offered for a price that can be fulfilled.
        </p>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-4xl">Delivery services</h2>
          <p className="mt-2 max-w-2xl text-muted">Availability depends on the route, the goods, the transport provider and the deadline. None of these pages promise that a vehicle is free right now.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="overflow-hidden rounded-2xl border border-line bg-paper">
                <img src={service.image} alt={service.imageAlt} className="h-40 w-full object-cover" />
                <span className="block p-4">
                  <span className="block font-display text-2xl">{service.nav}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted">{service.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-4xl">Industries served</h2>
          <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
            {industries.map(([name, copy]) => (
              <li key={name} className="px-4 py-3">
                <p className="font-semibold">{name}</p>
                <p className="text-sm text-muted">{copy}</p>
              </li>
            ))}
          </ul>
          <Link href="/industries" className="mt-4 inline-block text-sm font-semibold text-navy-800">Industry details</Link>
        </div>
        <div>
          <img src="/images/industrial-parts.jpg" alt="Precision metal parts prepared for an urgent dispatch." className="h-64 w-full rounded-3xl object-cover" />
          <img src="/images/automotive-parts.jpg" alt="Automotive parts boxed on a workshop bench." className="mt-4 h-48 w-full rounded-3xl object-cover" />
        </div>
      </section>

      <section className="bg-navy-950 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-4xl">Pricing, before you pay</h2>
          <p className="mt-3 max-w-3xl text-white/75">
            Indicative prices come from the rate card. A confirmed booking price is a figure dispatch has authorised, or a verified metro job with automatic acceptance switched on. The two are labelled differently. GST treatment follows the business setting: {pricing.gstRegistered ? (pricing.pricesIncludeGst ? "prices include GST" : "prices exclude GST") : "GST is not applicable"}.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {cards.slice(0, 3).map((service) => (
              <article key={service.code} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-display text-2xl">{service.name}</h3>
                <p className="mt-2 font-display text-3xl text-orange">From {formatAud(service.indicativeFromCents)}</p>
                <p className="mt-2 text-sm text-white/70">Base {formatAud(service.baseFeeCents)} · {formatAud(service.perKmCents)} per km · minimum {formatAud(service.minimumCents)}</p>
                <p className="mt-3 text-sm text-white/70">{service.limitations}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {cards.slice(3).map((service) => (
              <article key={service.code} className="rounded-2xl border border-white/10 p-5">
                <h3 className="font-display text-2xl">{service.name}</h3>
                <p className="mt-2 text-sm leading-6 text-white/75">{service.summary}</p>
                <p className="mt-2 text-sm text-orange">Indicative from {formatAud(service.indicativeFromCents)}. Not a confirmed rate.</p>
              </article>
            ))}
          </div>
          <Link href="/pricing" className="btn-orange mt-6">Read the pricing rules</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-4xl">Coverage we will actually talk about</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {locations.map((location) => (
            <Link key={location.slug} href={`/locations/${location.slug}`} className="overflow-hidden rounded-2xl border border-line bg-white">
              <img src={location.image} alt={location.imageAlt} className="h-40 w-full object-cover" />
              <span className="block p-5">
                <span className="font-display text-2xl">{location.h1}</span>
                <span className="mt-2 block text-sm leading-6 text-muted">{location.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-4xl">Questions dispatch actually gets</h2>
          <div className="mt-6">
            <FaqList items={faqs} />
          </div>
        </div>
      </section>
    </>
  );
}
