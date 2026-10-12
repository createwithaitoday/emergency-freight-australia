import { currentAdmin, roleAllows } from "@/lib/auth";
import {
  addInternalNote,
  refundBooking,
  savePricing,
  saveTemplate,
  setSellingPrice,
  transitionBooking,
} from "@/lib/db/repo";
import { AppError } from "@/lib/errors";
import { sameOrigin } from "@/lib/rate-limit";
import type { PricingConfig } from "@/lib/pricing/types";
import type { BookingStatus } from "@/lib/workflow";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const admin = await currentAdmin();
  if (!admin) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";
  try {
    if (action === "price") {
      if (!roleAllows(admin.role, "price")) return Response.json({ error: "You cannot change prices." }, { status: 403 });
      const netCents = Math.round(Number(body.netDollars) * 100);
      await setSellingPrice(admin.email, String(body.bookingId), netCents, body.overrideReason);
    } else if (action === "status") {
      if (!roleAllows(admin.role, "status") && !roleAllows(admin.role, "assign") && !roleAllows(admin.role, "pod")) {
        return Response.json({ error: "You cannot change this booking." }, { status: 403 });
      }
      await transitionBooking({
        actor: admin.email,
        bookingId: String(body.bookingId),
        to: body.to as BookingStatus,
        note: body.note,
        driverName: body.driverName,
        driverPhone: body.driverPhone,
        carrierName: body.carrierName,
        carrierCostCents: body.carrierCostDollars ? Math.round(Number(body.carrierCostDollars) * 100) : undefined,
        eta: body.eta,
        recipientName: body.recipientName,
        onAccount: Boolean(body.onAccount),
      });
    } else if (action === "note") {
      if (!roleAllows(admin.role, "notes")) return Response.json({ error: "You cannot add notes." }, { status: 403 });
      await addInternalNote(admin.email, String(body.bookingId), String(body.note ?? ""));
    } else if (action === "refund") {
      if (!roleAllows(admin.role, "refund")) return Response.json({ error: "You cannot refund." }, { status: 403 });
      await refundBooking(admin.email, String(body.bookingId), Math.round(Number(body.amountDollars) * 100), String(body.reason ?? ""));
    } else if (action === "pricing") {
      if (admin.role !== "admin") return Response.json({ error: "Only an administrator can change the rate card." }, { status: 403 });
      await savePricing(body.config as PricingConfig, admin.email);
    } else if (action === "template") {
      if (admin.role !== "admin") return Response.json({ error: "Only an administrator can edit templates." }, { status: 403 });
      await saveTemplate(String(body.code), String(body.channel), String(body.subject ?? ""), String(body.body ?? ""), admin.email);
    } else {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "The action failed.";
    const status = error instanceof AppError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
