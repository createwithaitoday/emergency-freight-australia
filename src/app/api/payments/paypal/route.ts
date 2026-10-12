import { getDb } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { paypalAccessToken, paypalAmount, paypalBase, paypalReturnUrl } from "@/lib/payments/paypal";
import { brand } from "@/lib/brand";
import { sameOrigin } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const access = await paypalAccessToken();
  if (!access) return Response.json({ error: "PayPal is not configured yet." }, { status: 503 });
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT b.id, b.status, b.selling_total_cents, b.estimate_prepay, q.payable, q.expires_at, q.public_number
       FROM bookings b JOIN quotes q ON q.id = b.quote_id WHERE b.tracking_token = $1`,
      [token],
    );
    const booking = rows[0];
    if (!booking) throw new AppError("Booking not found", 404);
    const payable = booking.payable === true || booking.payable === "t" || booking.payable === "true";
    const estimate = booking.estimate_prepay === true || booking.estimate_prepay === "t" || booking.estimate_prepay === "true";
    if (String(booking.status) !== "awaiting_payment" || (!payable && !estimate)) {
      throw new AppError("This booking does not have a price ready for payment.", 409);
    }
    if (booking.expires_at && new Date(String(booking.expires_at)).getTime() < Date.now()) {
      throw new AppError("This quote has expired.", 409);
    }
    const response = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          custom_id: String(booking.id),
          description: estimate ? `${brand.name} estimated price ${booking.public_number}` : `${brand.name} ${booking.public_number}`,
          amount: { currency_code: "AUD", value: paypalAmount(Number(booking.selling_total_cents)) },
        }],
        application_context: {
          return_url: paypalReturnUrl(token),
          cancel_url: `${brand.url.replace(/\/$/, "")}/track/${token}?payment=cancelled`,
          user_action: "PAY_NOW",
        },
      }),
    });
    const order = await response.json() as { id?: string; links?: { rel: string; href: string }[] };
    const url = order.links?.find((link) => link.rel === "approve")?.href;
    if (!response.ok || !url) throw new AppError("PayPal did not return a payment link.", 502);
    return Response.json({ url });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "PayPal checkout could not be started.";
    const status = error instanceof AppError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
