import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeoArticle } from "@/components/seo-article";
import { locations } from "@/lib/content";
import { getPublished } from "@/lib/seo/inventory";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return locations.map((location) => ({ slug: location.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const location = locations.find((item) => item.slug === slug);
  if (location) return { title: location.title, description: location.description, alternates: { canonical: `/locations/${location.slug}` } };
  const page = await getPublished(`/locations/${slug}`);
  if (!page) return {};
  return { title: page.doc.title, description: page.doc.description, alternates: { canonical: page.doc.canonicalPath } };
}

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const location = locations.find((item) => item.slug === slug);
  if (!location) {
    const page = await getPublished(`/locations/${slug}`);
    if (!page) notFound();
    return <SeoArticle doc={page.doc} updated={page.updated} />;
  }
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <img src={location.image} alt={location.imageAlt} className="h-72 w-full rounded-3xl object-cover" />
      <h1 className="mt-6 font-display text-5xl">{location.h1}</h1>
      {location.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 leading-7">{paragraph}</p>)}
      <Link href="/book" className="btn-orange mt-8">Calculate a price for this route</Link>
    </article>
  );
}
