import { brand } from "@/lib/brand";
import { createMagicLink } from "@/lib/db/repo";
import { notifyCodes } from "@/lib/notifications";
import { clientKey, rateLimit, sameOrigin } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  if (!rateLimit(`magic:${clientKey(request)}`, 5, 15 * 60_000)) {
    return Response.json({ error: "Too many sign-in attempts." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email." }, { status: 400 });
  const token = await createMagicLink(parsed.data.email);
  const link = `${brand.url.replace(/\/$/, "")}/api/auth/verify?token=${encodeURIComponent(token)}`;
  await notifyCodes(["magic_link"], {
    toEmail: parsed.data.email,
    vars: { link, brand: brand.name, name: "", number: "", total: "", gst: "", expires: "", track_url: "", admin_url: "", pickup: "", delivery: "", status: "", eta: "" },
  });
  const devLink = process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY ? link : undefined;
  return Response.json({ ok: true, devLink });
}
