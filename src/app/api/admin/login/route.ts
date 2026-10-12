import { cookies } from "next/headers";
import { adminCookie } from "@/lib/auth";
import { loginAdmin } from "@/lib/db/repo";
import { clientKey, rateLimit, sameOrigin } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  if (!rateLimit(`admin:${clientKey(request)}`, 8, 15 * 60_000)) {
    return Response.json({ error: "Too many sign-in attempts." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const result = await loginAdmin(email, password);
  if (!result) return Response.json({ error: "Those details were not recognised." }, { status: 401 });
  const jar = await cookies();
  jar.set(adminCookie.name, result.session, adminCookie.options);
  return Response.json({ ok: true });
}
