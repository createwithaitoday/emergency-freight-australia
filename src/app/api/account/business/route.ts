import { currentCustomer } from "@/lib/auth";
import { applyForBusiness } from "@/lib/db/repo";
import { sameOrigin } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const customer = await currentCustomer();
  if (!customer) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const legalName = typeof body?.legalName === "string" ? body.legalName.trim() : "";
  if (legalName.length < 2) return Response.json({ error: "Enter the legal business name." }, { status: 400 });
  const id = await applyForBusiness(customer.id, {
    legalName,
    abn: String(body?.abn ?? ""),
    notes: String(body?.notes ?? ""),
  });
  return Response.json({ id, status: "pending" });
}
