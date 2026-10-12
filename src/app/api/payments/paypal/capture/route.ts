import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { markPaid } from "@/lib/db/repo";
import { brand } from "@/lib/brand";
import { paypalAccessToken, paypalBase } from "@/lib/payments/paypal";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paypalOrderId = url.searchParams.get("token");
  const tracking = url.searchParams.get("booking") || "";
  const base = brand.url.replace(/\/$/, "");
  const access = await paypalAccessToken();
  if (!access || !paypalOrderId) return NextResponse.redirect(`${base}/track/${tracking}?payment=cancelled`);
  const response = await fetch(`${paypalBase()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
  });
  const order = await response.json() as {
    id?: string;
    status?: string;
    purchase_units?: { custom_id?: string; payments?: { captures?: { id?: string; amount?: { value?: string } }[] } }[];
  };
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  const bookingId = order.purchase_units?.[0]?.custom_id;
  const amountCents = Math.round(Number(capture?.amount?.value ?? "0") * 100);
  if (!response.ok || order.status !== "COMPLETED" || !bookingId || !capture?.id) {
    return NextResponse.redirect(`${base}/track/${tracking}?payment=cancelled`);
  }
  try {
    await markPaid({
      bookingId,
      provider: "paypal",
      providerRef: capture.id,
      amountCents,
      eventId: order.id,
      actor: "paypal",
    });
  } catch {
    return NextResponse.redirect(`${base}/track/${tracking}?payment=cancelled`);
  }
  const db = await getDb();
  const rows = await db.query(`SELECT tracking_token FROM bookings WHERE id = $1`, [bookingId]);
  const trackingToken = String(rows[0]?.tracking_token ?? tracking);
  return NextResponse.redirect(`${base}/booking/success?token=${trackingToken}`);
}
