import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackActions } from "@/components/track-actions";
import { getPublicTracking } from "@/lib/db/repo";
import { formatAud } from "@/lib/money";
import { customerMayCancel, PUBLIC_STATUS, type BookingStatus } from "@/lib/workflow";

export const metadata: Metadata = { title: "Delivery tracking", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicTracking(token);
  if (!data) notFound();
  const status = String(data.booking.status) as BookingStatus;
  const payable = data.booking.payable === true || data.booking.payable === "t";
  const estimate = data.booking.estimate_prepay === true || data.booking.estimate_prepay === "t";
  const canPay = status === "awaiting_payment" && (payable || estimate);
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-orange">{String(data.booking.public_number)}</p>
      <h1 className="mt-2 font-display text-4xl">{PUBLIC_STATUS[status] ?? status}</h1>
      <p className="mt-2 text-muted">{String(data.booking.service_name)}</p>
      <p className="mt-4">{String(data.booking.pickup_suburb)} {String(data.booking.pickup_postcode)} to {String(data.booking.delivery_suburb)} {String(data.booking.delivery_postcode)}</p>
      <p className="mt-2">Payment: {String(data.booking.payment_status).replaceAll("_", " ")}</p>
      <p>Price: {formatAud(Number(data.booking.selling_total_cents))} {payable || status === "confirmed" ? "" : "(not confirmed)"}</p>
      {data.booking.customer_eta ? <p>Dispatch estimate: {String(data.booking.customer_eta)}. This is not a guaranteed time.</p> : null}
      <ol className="mt-6 space-y-3 border-l border-line pl-4">
        {data.events.map((event) => (
          <li key={String(event.created_at) + String(event.message)}>
            <p>{String(event.message)}</p>
            <p className="text-xs text-muted">{new Date(String(event.created_at)).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</p>
          </li>
        ))}
      </ol>
      {data.pod && <p className="mt-4">Received by {String(data.pod.recipient_name)}.</p>}
      {data.invoice && <a className="mt-4 inline-block underline" href={`/invoice/${token}`}>Tax invoice {String(data.invoice.number)}</a>}
      <TrackActions token={token} canPay={canPay} canCancel={customerMayCancel(status)} demo={process.env.DEMO_PAYMENTS === "true" && process.env.NODE_ENV !== "production"} />
    </article>
  );
}
