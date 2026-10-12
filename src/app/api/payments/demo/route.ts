import { getDb } from "@/lib/db/client";
import { markPaid } from "@/lib/db/repo";
import { AppError } from "@/lib/errors";
import { sameOrigin } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (process.env.DEMO_PAYMENTS !== "true" || process.env.NODE_ENV === "production") {
    return Response.json({ error: "Demo payments are disabled." }, { status: 404 });
  }
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const db = await getDb();
  const rows = await db.query(`SELECT id, selling_total_cents FROM bookings WHERE tracking_token = $1`, [token]);
  if (!rows[0]) return Response.json({ error: "Booking not found" }, { status: 404 });
  try {
    await markPaid({
      bookingId: String(rows[0].id),
      provider: "demo",
      providerRef: `demo:${rows[0].id}`,
      amountCents: Number(rows[0].selling_total_cents),
      eventId: `demo:${rows[0].id}`,
      actor: "demo",
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Demo payment failed.";
    const status = error instanceof AppError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
