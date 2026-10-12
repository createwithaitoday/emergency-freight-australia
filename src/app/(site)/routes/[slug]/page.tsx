import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoArticle } from "@/components/seo-article";
import { getPublished } from "@/lib/seo/inventory";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublished(`/routes/${slug}`);
  if (!page) return {};
  return { title: page.doc.title, description: page.doc.description, alternates: { canonical: page.doc.canonicalPath } };
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublished(`/routes/${slug}`);
  if (!page) notFound();
  return <SeoArticle doc={page.doc} updated={page.updated} />;
}
