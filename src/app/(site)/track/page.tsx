import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track a delivery",
  description: "Open a delivery with the private tracking link from your confirmation. Booking numbers alone are not enough.",
  alternates: { canonical: "/track" },
};

export default function TrackIndexPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-4xl">Track a delivery</h1>
      <p className="mt-3 text-muted">Use the private link from your request email. A booking number on its own will not open the job.</p>
    </div>
  );
}
