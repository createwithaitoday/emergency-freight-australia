import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { services } from "@/lib/content";
import { getStoredPricing } from "@/lib/db/repo";
import { defaultPricing } from "@/lib/pricing/defaults";
import { formatAud } from "@/lib/money";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);
  if (!service) return {};
  return { title: service.title, description: service.description, alternates: { canonical: `/services/${service.slug}` } };
}

export const dynamic = "force-dynamic";

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);
  if (!service) notFound();
  const pricing = await getStoredPricing().catch(() => defaultPricing);
  const rate = pricing.services.find((item) => item.code === service.rateCode);
  const related = services.filter((item) => (service.related as readonly string[]).includes(item.slug));
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <img src={service.image} alt={service.imageAlt} className="h-72 w-full rounded-3xl object-cover" />
      <h1 className="mt-6 font-display text-5xl">{service.h1}</h1>
      {rate && <p className="mt-3 text-lg">Indicative from {formatAud(rate.indicativeFromCents)}. {pricing.pricesIncludeGst ? "GST included in the rate card." : "Rate card amounts exclude GST."}</p>}
      {service.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 leading-7">{paragraph}</p>)}
      <h2 className="mt-8 font-display text-2xl">What this request covers</h2>
      <ul className="mt-2 list-disc pl-5">{service.includes.map((item) => <li key={item}>{item}</li>)}</ul>
      <h2 className="mt-8 font-display text-2xl">Limits</h2>
      <ul className="mt-2 list-disc pl-5">{service.limits.map((item) => <li key={item}>{item}</li>)}</ul>
      <Link href="/book" className="btn-orange mt-8">Calculate delivery price</Link>
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        {related.map((item) => <Link key={item.slug} className="underline" href={`/services/${item.slug}`}>{item.nav}</Link>)}
      </div>
    </article>
  );
}
