import Link from "next/link";
import { brand } from "@/lib/brand";
import { ConsentAndAnalytics } from "@/components/analytics";
import { PhoneLink } from "@/components/phone-link";

const links = [
  ["/services", "Services"],
  ["/locations", "Coverage"],
  ["/pricing", "Pricing"],
  ["/industries", "Industries"],
  ["/faq", "FAQ"],
  ["/track", "Track"],
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <img src="/images/logo-mark.jpg" alt="" className="h-10 w-10 rounded-lg object-cover" />
            <span className="leading-tight">
              <span className="block font-display text-sm font-semibold tracking-wide">{brand.name}</span>
              <span className="block text-xs text-white/60">{brand.positioning}</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-5 text-sm text-white/80 lg:flex">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
          <PhoneLink className="ml-auto hidden text-sm font-semibold text-orange md:inline lg:ml-4" />
          <Link href="/book" className="btn-orange hidden px-4 py-2 text-sm md:inline-flex">
            {brand.primaryCta}
          </Link>
        </div>
      </header>
      <main id="main" className="pb-24 md:pb-0">
        {children}
      </main>
      <footer className="bg-navy-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-display text-xl">{brand.name}</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/70">{brand.serviceAreaNote}</p>
            <p className="mt-3 text-sm text-white/70">
              {brand.phoneDisplay} · {brand.email}
              {brand.abn ? ` · ABN ${brand.abn}` : ""}
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Services</p>
            <Link className="mt-2 block text-white/70" href="/services/emergency-sydney-courier">Sydney courier</Link>
            <Link className="mt-2 block text-white/70" href="/services/interstate-hotshot-freight">Interstate hotshot</Link>
            <Link className="mt-2 block text-white/70" href="/services/industrial-parts-delivery">Industrial parts</Link>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Policies</p>
            {[
              ["/legal/terms", "Terms"],
              ["/legal/privacy", "Privacy"],
              ["/legal/cancellations", "Cancellations"],
              ["/legal/insurance", "Insurance"],
              ["/account", "Account"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="mt-2 block text-white/70">{label}</Link>
            ))}
          </div>
        </div>
      </footer>
      <div className="fixed inset-x-0 bottom-0 z-40 hidden max-md:grid max-md:grid-cols-2 max-md:gap-2 border-t border-white/10 bg-navy-950/95 p-3">
        <Link href="/book" className="btn-orange py-3 text-sm">Calculate price</Link>
        <PhoneLink className="btn-ghost py-3 text-sm" label="Call dispatch" />
      </div>
      <ConsentAndAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} adsId={process.env.NEXT_PUBLIC_ADS_ID} />
    </>
  );
}
