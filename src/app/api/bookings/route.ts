import { createBooking } from "@/lib/db/repo";
import { AppError } from "@/lib/errors";
import { clientKey, rateLimit, sameOrigin } from "@/lib/rate-limit";
import { bookingSchema, toQuoteInput } from "@/lib/validators";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  if (!rateLimit(`book:${clientKey(request)}`, 12, 10 * 60_000)) {
    return Response.json({ error: "Too many booking attempts. Wait a few minutes." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the booking details." }, { status: 400 });
  }
  if (parsed.data.website) return Response.json({ error: "The request could not be lodged." }, { status: 400 });
  try {
    const result = await createBooking({ ...toQuoteInput(parsed.data), ...parsed.data });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof AppError ? error.message : "The booking could not be lodged.";
    const status = error instanceof AppError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
