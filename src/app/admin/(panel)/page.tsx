import Link from "next/link";
import { listBookings } from "@/lib/db/repo";
import { formatAud } from "@/lib/money";
import { PUBLIC_STATUS, type BookingStatus } from "@/lib/workflow";

export const dynamic = "force-dynamic";

const columns: { status: BookingStatus; title: string }[] = [
  { status: "new_request", title: "New requests" },
  { status: "awaiting_price_confirmation", title: "Awaiting price" },
  { status: "awaiting_availability", title: "Awaiting availability" },
  { status: "awaiting_payment", title: "Awaiting payment" },
  { status: "confirmed", title: "Confirmed" },
  { status: "driver_allocated", title: "Driver allocated" },
  { status: "collected", title: "Collected" },
  { status: "in_transit", title: "In transit" },
  { status: "delivered", title: "Delivered" },
  { status: "failed", title: "Failed" },
  { status: "cancelled", title: "Cancelled" },
  { status: "declined", title: "Declined" },
];

export default async function DispatchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const rows = await listBookings("", params.q ?? "");
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl">Dispatch board</h1>
        <form>
          <input className="field bg-white text-ink" name="q" defaultValue={params.q ?? ""} placeholder="Number, email or suburb" aria-label="Search bookings" />
        </form>
      </div>
      <div className="mt-6 flex gap-3 overflow-x-auto pb-4">
        {columns.map((column) => {
          const items = rows.filter((row) => row.status === column.status);
          return (
            <section key={column.status} className="w-72 shrink-0">
              <h2 className="text-sm font-semibold text-white/70">{column.title} · {items.length}</h2>
              <div className="mt-2 grid gap-2">
                {items.length === 0 && <p className="rounded-xl border border-white/10 p-3 text-xs text-white/40">None</p>}
                {items.map((row) => (
                  <Link key={String(row.id)} href={`/admin/bookings/${row.id}`} className="block rounded-xl bg-white p-3 text-ink">
                    <span className="font-semibold">{String(row.public_number)}</span>
                    <span className="mt-1 block text-sm">{String(row.pickup_suburb)} {String(row.pickup_postcode)} → {String(row.delivery_suburb)} {String(row.delivery_postcode)}</span>
                    <span className="mt-1 block text-xs text-muted">{PUBLIC_STATUS[column.status]} · {formatAud(Number(row.selling_total_cents))} · {String(row.payment_status)}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
