import { quoteDraft } from "@/lib/db/repo";
import { AppError } from "@/lib/errors";
import { clientKey, rateLimit, sameOrigin } from "@/lib/rate-limit";
import { quoteSchema, toQuoteInput } from "@/lib/validators";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  if (!rateLimit(`quote:${clientKey(request)}`, 40, 10 * 60_000)) {
    return Response.json({ error: "Too many price checks. Wait a few minutes." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the delivery details." }, { status: 400 });
  }
  try {
    const quote = await quoteDraft(toQuoteInput(parsed.data));
    return Response.json(quote);
  } catch (error) {
    const message = error instanceof AppError ? error.message : "The price could not be calculated.";
    const status = error instanceof AppError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
