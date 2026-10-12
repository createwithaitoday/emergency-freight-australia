import type { Metadata } from "next";
import Link from "next/link";
import { industries } from "@/lib/content";

export const metadata: Metadata = {
  title: "Industries",
  description: "Urgent delivery for manufacturing, construction, workshops, maintenance, hire, warehousing, engineering and retail transfers.",
  alternates: { canonical: "/industries" },
};

export default function IndustriesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-5xl">Industries</h1>
      <p className="mt-3 text-muted">The same booking rules apply. A trade is not a guarantee of a special rate or a permanent vehicle on standby.</p>
      <img src="/images/machinery-parts.jpg" alt="Machinery spare parts staged on a pallet." className="mt-6 h-72 w-full rounded-3xl object-cover" />
      <ul className="mt-8 space-y-4">
        {industries.map(([name, copy]) => (
          <li key={name} className="rounded-2xl border border-line bg-white p-4">
            <h2 className="font-display text-2xl">{name}</h2>
            <p className="text-sm text-muted">{copy}</p>
          </li>
        ))}
      </ul>
      <Link href="/services/industrial-parts-delivery" className="mt-6 inline-block font-semibold underline">Industrial parts delivery</Link>
    </div>
  );
}
