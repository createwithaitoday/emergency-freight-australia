import Link from "next/link";
import { brand } from "@/lib/brand";
import type { PageImage } from "@/lib/page-images";
import type { SeoDocument } from "@/lib/seo/quality";

export function SeoArticle({ doc, updated, image }: { doc: SeoDocument; updated?: string | null; image?: PageImage | null }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: doc.h1,
    description: doc.summary,
    serviceType: doc.h1,
    areaServed: "AU",
    provider: { "@type": "Organization", name: brand.name, telephone: brand.phoneDisplay, url: brand.url },
    url: `${brand.url.replace(/\/$/, "")}${doc.canonicalPath}`,
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: doc.breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: `${brand.url.replace(/\/$/, "")}${crumb.href}`,
    })),
  };
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-2">
          <li><Link href="/">Home</Link></li>
          {doc.breadcrumbs.map((crumb) => (
            <li key={crumb.href}>/ <Link href={crumb.href}>{crumb.label}</Link></li>
          ))}
        </ol>
      </nav>
      {image ? <img src={image.src} alt={image.alt} className="mt-6 h-72 w-full rounded-3xl object-cover" /> : null}
      <h1 className="mt-4 font-display text-5xl">{doc.h1}</h1>
      <p className="mt-4 text-lg leading-8">{doc.summary}</p>
      {doc.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="font-display text-2xl">{section.heading}</h2>
          <p className="mt-2 leading-7">{section.body}</p>
        </section>
      ))}
      <h2 className="mt-8 font-display text-2xl">Questions</h2>
      <dl className="mt-3 space-y-4">
        {doc.faqs.map((faq) => (
          <div key={faq.q}>
            <dt className="font-semibold">{faq.q}</dt>
            <dd className="text-muted">{faq.a}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        {doc.links.map((link) => (
          <Link key={link.href} href={link.href} className="btn-orange">{link.label}</Link>
        ))}
      </div>
      {updated ? <p className="mt-6 text-xs text-muted">Updated {new Date(updated).toLocaleDateString("en-AU")}</p> : null}
    </article>
  );
}
