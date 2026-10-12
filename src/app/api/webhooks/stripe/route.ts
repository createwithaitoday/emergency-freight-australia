import { markPaid } from "@/lib/db/repo";
import { AppError } from "@/lib/errors";
import Stripe from "stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return Response.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  const stripe = new Stripe(key);
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId || session.client_reference_id;
    if (!bookingId || session.payment_status !== "paid") return Response.json({ ignored: true });
    try {
      await markPaid({
        bookingId,
        provider: "stripe",
        providerRef: session.id,
        amountCents: session.amount_total ?? 0,
        eventId: event.id,
        actor: "stripe",
      });
    } catch (error) {
      if (error instanceof AppError && error.status === 409) {
        return Response.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  }
  return Response.json({ received: true });
}
