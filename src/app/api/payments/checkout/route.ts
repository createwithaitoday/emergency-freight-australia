import { getDb } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { sameOrigin } from "@/lib/rate-limit";
import { brand } from "@/lib/brand";
import Stripe from "stripe";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) return Response.json({ error: "Missing tracking token" }, { status: 400 });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ configured: false, error: "Card payments are not configured yet. Dispatch can send a payment link once they are." }, { status: 503 });
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT b.id, b.status, b.payment_status, b.selling_total_cents, b.tracking_token, q.payable, q.expires_at, q.public_number, d.contact_email
       FROM bookings b JOIN quotes q ON q.id = b.quote_id JOIN delivery_requests d ON d.id = b.delivery_request_id
       WHERE b.tracking_token = $1`,
      [token],
    );
    const booking = rows[0];
    if (!booking) throw new AppError("Booking not found", 404);
    const payable = booking.payable === true || booking.payable === "t" || booking.payable === "true";
    if (String(booking.status) !== "awaiting_payment" || !payable) {
      throw new AppError("This booking does not have a confirmed price ready for payment.", 409);
    }
    if (booking.expires_at && new Date(String(booking.expires_at)).getTime() < Date.now()) {
      throw new AppError("This quote has expired. Ask dispatch to reconfirm it.", 409);
    }
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: String(booking.contact_email),
      client_reference_id: String(booking.id),
      metadata: { bookingId: String(booking.id) },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: Number(booking.selling_total_cents),
          product_data: { name: `${brand.name} ${booking.public_number}` },
        },
      }],
      success_url: `${brand.url.replace(/\/$/, "")}/booking/success?token=${token}`,
      cancel_url: `${brand.url.replace(/\/$/, "")}/track/${token}?payment=cancelled`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Checkout could not be started.";
    const status = error instanceof AppError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
