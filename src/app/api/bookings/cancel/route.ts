import { cancelByToken } from "@/lib/db/repo";
import { AppError } from "@/lib/errors";
import { sameOrigin } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ token: z.string().min(10), reason: z.string().max(300).optional().default("") });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Missing tracking token" }, { status: 400 });
  try {
    await cancelByToken(parsed.data.token, parsed.data.reason);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "The booking could not be cancelled.";
    const status = error instanceof AppError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
