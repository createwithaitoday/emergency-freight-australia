import type { Metadata } from "next";
import Link from "next/link";
import { locations } from "@/lib/content";

export const metadata: Metadata = {
  title: "Coverage",
  description: "Sydney metro, Greater Sydney, regional NSW and the Sydney interstate corridors we will coordinate.",
  alternates: { canonical: "/locations" },
};

export default function LocationsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-5xl">Coverage</h1>
      <p className="mt-3 max-w-2xl text-muted">Requests can start in New South Wales, Queensland or Victoria. A suburb page is published only after review. A listing is not a guarantee that a driver is free.</p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/locations/nsw">New South Wales</Link>
        <Link href="/locations/qld">Queensland</Link>
        <Link href="/locations/vic">Victoria</Link>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {locations.map((location) => (
          <Link key={location.slug} href={`/locations/${location.slug}`} className="overflow-hidden rounded-2xl border border-line bg-white">
            <img src={location.image} alt={location.imageAlt} className="h-44 w-full object-cover" />
            <span className="block p-5">
              <span className="font-display text-3xl">{location.h1}</span>
              <span className="mt-2 block text-sm text-muted">{location.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
