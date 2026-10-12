import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoArticle } from "@/components/seo-article";
import { imageForPlace } from "@/lib/page-images";
import { getPublished } from "@/lib/seo/inventory";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; place: string }> }): Promise<Metadata> {
  const { slug, place } = await params;
  const page = await getPublished(`/locations/${slug}/${place}`);
  if (!page) return {};
  return { title: page.doc.title, description: page.doc.description, alternates: { canonical: page.doc.canonicalPath } };
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string; place: string }> }) {
  const { slug, place } = await params;
  const page = await getPublished(`/locations/${slug}/${place}`);
  if (!page) notFound();
  return <SeoArticle doc={page.doc} updated={page.updated} image={imageForPlace(place)} />;
}
