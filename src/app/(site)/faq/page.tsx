import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";
import { faqs } from "@/lib/content";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Collection times, overnight requests, interstate delivery, pricing, tracking and business accounts.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="font-display text-5xl">Frequently asked questions</h1>
      <div className="mt-6"><FaqList items={faqs} /></div>
    </div>
  );
}
