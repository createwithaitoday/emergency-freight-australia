import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import { invoiceForToken } from "@/lib/db/repo";
import { formatAud } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await invoiceForToken(token);
  if (!invoice) notFound();
  const registered = invoice.gst_registered === true || invoice.gst_registered === "t";
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-sm uppercase tracking-wide text-muted">Tax invoice</p>
      <h1 className="font-display text-4xl">{String(invoice.number)}</h1>
      <p className="mt-2">{brand.legalName}{brand.abn ? ` · ABN ${brand.abn}` : ""}</p>
      <p>{String(invoice.business_name || invoice.contact_name)} · {String(invoice.contact_email)}</p>
      <p className="mt-4">{String(invoice.service_name)} · {String(invoice.public_number)}</p>
      <p>{String(invoice.pickup_suburb)} {String(invoice.pickup_postcode)} to {String(invoice.delivery_suburb)} {String(invoice.delivery_postcode)}</p>
      <dl className="mt-6 space-y-2">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatAud(Number(invoice.subtotal_cents))}</dd></div>
        <div className="flex justify-between"><dt>{registered ? "GST" : "GST not applicable"}</dt><dd>{formatAud(Number(invoice.gst_cents))}</dd></div>
        <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatAud(Number(invoice.total_cents))}</dd></div>
      </dl>
      <p className="mt-4 text-sm text-muted">Payment status: {String(invoice.payment_status)}. Use your browser’s print dialog to save a PDF.</p>
    </article>
  );
}
