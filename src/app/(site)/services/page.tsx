import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/lib/content";

export const metadata: Metadata = {
  title: "Delivery services",
  description: "Emergency Sydney courier, after-hours, overnight, dedicated, interstate hotshot and industrial parts delivery.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-5xl">Delivery services</h1>
      <p className="mt-3 max-w-2xl text-muted">Each service is a way to request transport. It is available only when the route, the goods and a provider line up with the deadline.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Link key={service.slug} href={`/services/${service.slug}`} className="overflow-hidden rounded-2xl border border-line bg-white">
            <img src={service.image} alt={service.imageAlt} className="h-44 w-full object-cover" />
            <span className="block p-5">
              <span className="font-display text-2xl">{service.nav}</span>
              <span className="mt-2 block text-sm leading-6 text-muted">{service.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
