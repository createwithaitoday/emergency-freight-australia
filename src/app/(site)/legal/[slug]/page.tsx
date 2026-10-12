import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { legalPages } from "@/lib/content";

export function generateStaticParams() {
  return legalPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = legalPages.find((item) => item.slug === slug);
  if (!page) return {};
  return { title: page.title, description: page.description, alternates: { canonical: `/legal/${page.slug}` } };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = legalPages.find((item) => item.slug === slug);
  if (!page) notFound();
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-5xl">{page.title}</h1>
      {page.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </article>
  );
}
