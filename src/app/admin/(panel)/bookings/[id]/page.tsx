import { notFound } from "next/navigation";
import { AdminBookingForm } from "@/components/admin-booking";
import { getAdminBooking } from "@/lib/db/repo";
import { formatAud } from "@/lib/money";
import { grossProfitCents } from "@/lib/pricing/engine";

export const dynamic = "force-dynamic";

export default async function AdminBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAdminBooking(id);
  if (!data) notFound();
  const booking = data.booking;
  const profit = booking.carrier_cost_cents == null ? null : grossProfitCents(Number(booking.selling_net_cents), Number(booking.carrier_cost_cents), Number(booking.payment_fee_cents));
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <h1 className="font-display text-3xl">{String(booking.public_number)}</h1>
        <p className="mt-2 text-white/70">{String(booking.status)} · payment {String(booking.payment_status)} · {String(booking.service_name)}</p>
        <p className="mt-4">{String(booking.contact_name)} · {String(booking.contact_email)} · {String(booking.contact_phone)}</p>
        <p>{String(booking.pickup_suburb)} {String(booking.pickup_postcode)} → {String(booking.delivery_suburb)} {String(booking.delivery_postcode)}</p>
        <p className="mt-2 text-sm text-white/70">{String(booking.freight_description)} · {String(booking.category)} · {Number(booking.weight_grams) / 1000} kg · dangerous goods {booking.dangerous_goods ? "yes" : "no"}</p>
        <p className="mt-2">Selling {formatAud(Number(booking.selling_total_cents))} including GST {formatAud(Number(booking.selling_gst_cents))}</p>
        <p>Carrier cost {booking.carrier_cost_cents == null ? "not recorded" : formatAud(Number(booking.carrier_cost_cents))}</p>
        <p>Job gross profit {profit == null ? "waiting on a carrier cost" : formatAud(profit)}. Overheads are not included.</p>
        {booking.internal_notes ? <p className="mt-3 rounded-xl bg-white/10 p-3 text-sm">Internal: {String(booking.internal_notes)}</p> : null}
        <h2 className="mt-6 font-semibold">Price lines</h2>
        <ul className="mt-2 text-sm text-white/80">
          {data.lines.map((line) => <li key={String(line.code)}>{String(line.description)} · {formatAud(Number(line.amount_cents))}</li>)}
        </ul>
        <h2 className="mt-6 font-semibold">History</h2>
        <ul className="mt-2 text-sm text-white/70">
          {data.events.map((event) => <li key={String(event.created_at)}>{String(event.from_status || "—")} → {String(event.to_status)} · {String(event.actor || "")} · {String(event.note || "")}</li>)}
        </ul>
      </section>
      <AdminBookingForm bookingId={id} />
    </div>
  );
}
