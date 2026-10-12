import { customerBookings, listAddresses, listBusiness } from "@/lib/db/repo";
import { currentCustomer } from "@/lib/auth";
import { formatAud } from "@/lib/money";
import { PUBLIC_STATUS, type BookingStatus } from "@/lib/workflow";
import { AccountForms } from "@/components/account-forms";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const customer = await currentCustomer();
  if (!customer) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-4xl">Your deliveries</h1>
        <p className="mt-3 text-muted">Sign in with an email link. It expires in 30 minutes.</p>
        {params.error && <p className="mt-3 text-sm text-red-700">That link has expired or already been used.</p>}
        <AccountForms mode="login" />
      </div>
    );
  }
  const [bookings, addresses, businesses] = await Promise.all([
    customerBookings(customer.id),
    listAddresses(customer.id),
    listBusiness(customer.id),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Hello{customer.name ? `, ${customer.name}` : ""}</h1>
        <form action="/api/auth/logout" method="post"><button className="text-sm underline" type="submit">Sign out</button></form>
      </div>
      <p className="text-sm text-muted">{customer.email}</p>
      <h2 className="mt-8 font-display text-2xl">Bookings</h2>
      <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
        {bookings.length === 0 && <li className="p-4 text-sm text-muted">No bookings on this email yet.</li>}
        {bookings.map((booking) => (
          <li key={String(booking.id)} className="p-4">
            <a className="font-semibold" href={`/track/${booking.tracking_token}`}>{String(booking.public_number)}</a>
            <p className="text-sm text-muted">{PUBLIC_STATUS[String(booking.status) as BookingStatus]} · {formatAud(Number(booking.selling_total_cents))}</p>
            <p className="text-sm">{String(booking.pickup_suburb)} {String(booking.pickup_postcode)} to {String(booking.delivery_suburb)} {String(booking.delivery_postcode)}</p>
            <a className="text-sm underline" href={`/book?pickupSuburb=${encodeURIComponent(String(booking.pickup_suburb ?? ""))}&pickupPostcode=${booking.pickup_postcode}&deliverySuburb=${encodeURIComponent(String(booking.delivery_suburb ?? ""))}&deliveryPostcode=${booking.delivery_postcode}`}>Book this lane again</a>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-display text-2xl">Saved addresses</h2>
      <ul className="mt-3 text-sm">{addresses.map((address) => <li key={String(address.id)}>{String(address.label)} · {String(address.line1)} {String(address.suburb)} {String(address.postcode)}</li>)}</ul>
      <AccountForms mode="address" />
      <h2 className="mt-8 font-display text-2xl">Business account</h2>
      <ul className="mt-3 text-sm">
        {businesses.map((business) => (
          <li key={String(business.id)}>{String(business.legal_name)} · {String(business.status)} · credit {business.credit_terms_approved ? "approved" : "not approved"}</li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-muted">Credit terms stay unavailable until an administrator approves them.</p>
      <AccountForms mode="business" />
    </div>
  );
}
