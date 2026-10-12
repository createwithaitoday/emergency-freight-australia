import { currentCustomer } from "@/lib/auth";
import { saveAddress } from "@/lib/db/repo";
import { sameOrigin } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const customer = await currentCustomer();
  if (!customer) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const postcode = String(body?.postcode ?? "");
  const line1 = String(body?.line1 ?? "").trim();
  if (!/^\d{4}$/.test(postcode) || line1.length < 3) {
    return Response.json({ error: "Enter an address and a four-digit postcode." }, { status: 400 });
  }
  await saveAddress(customer.id, {
    label: String(body?.label ?? "Saved"),
    line1,
    suburb: String(body?.suburb ?? ""),
    postcode,
    instructions: String(body?.instructions ?? ""),
  });
  return Response.json({ ok: true });
}
