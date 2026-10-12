import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import type { BookingDraft } from "@/lib/db/repo";

process.env.PGDATA_DIR = path.join(os.tmpdir(), `efa-test-${process.pid}`);
process.env.PRICING_AUTO_ACCEPT = "false";

let repo: typeof import("@/lib/db/repo");
let db: typeof import("@/lib/db/client");

beforeAll(async () => {
  db = await import("@/lib/db/client");
  db.resetDbForTests();
  repo = await import("@/lib/db/repo");
});

function draft(overrides: Partial<BookingDraft> = {}): BookingDraft {
  return {
    pickupAddress: "1 George Street",
    pickupSuburb: "Sydney",
    pickupPostcode: "2000",
    deliveryAddress: "Airport Drive",
    deliverySuburb: "Mascot",
    deliveryPostcode: "2020",
    extraStops: 0,
    urgency: "asap",
    category: "industrial_parts",
    packages: 1,
    weightPerPackageKg: 8,
    lengthCm: 40,
    widthCm: 30,
    heightCm: 20,
    fragile: false,
    palletised: false,
    forkliftRequired: false,
    tailLiftRequired: false,
    loadingAssistance: false,
    dangerousGoods: false,
    goodsValueCents: 15000,
    waitingMinutes: 0,
    tollsCents: 0,
    airCoordination: false,
    publicHoliday: false,
    serviceCode: "metro_express",
    idempotencyKey: `key-${Math.random()}`,
    description: "Gearbox sensor",
    dgDeclaration: "",
    contactName: "Alex Nguyen",
    businessName: "Harbour Plant",
    email: "alex@example.com",
    phone: "0400000000",
    pickupContact: "Gatehouse",
    deliveryContact: "Workshop",
    accessInstructions: "Call on arrival",
    purchaseOrder: "PO-100",
    specialRequirements: "",
    utm: {},
    ...overrides,
  };
}

describe("booking workflow", () => {
  it("keeps an unverified metro job indicative, then accepts payment only at the approved total", async () => {
    const created = await repo.createBooking(draft());
    expect(created.status).toBe("new_request");
    expect(created.duplicate).toBe(false);

    const again = await repo.createBooking(draft({ idempotencyKey: created.bookingId && draft().idempotencyKey }));
    expect(again.duplicate).toBe(false);

    const replay = await repo.createBooking(draft({ idempotencyKey: (await repo.createBooking(draft({ idempotencyKey: "same-key" }))).bookingId ? "same-key" : "same-key" }));
    expect(replay.duplicate).toBe(true);

    const first = await repo.createBooking(draft({ idempotencyKey: "pay-flow", email: "pay@example.com" }));
    await expect(repo.markPaid({
      bookingId: first.bookingId,
      provider: "demo",
      providerRef: "demo:too-soon",
      amountCents: 16390,
    })).rejects.toBeInstanceOf(AppError);

    const priced = await repo.setSellingPrice("dispatch@example.com", first.bookingId, 20000);
    expect(priced.gstCents).toBe(2000);
    expect(priced.totalCents).toBe(22000);

    await expect(repo.markPaid({
      bookingId: first.bookingId,
      provider: "demo",
      providerRef: "demo:wrong",
      amountCents: 16390,
    })).rejects.toMatchObject({ status: 409 });

    const paid = await repo.markPaid({
      bookingId: first.bookingId,
      provider: "demo",
      providerRef: "demo:right",
      amountCents: 22000,
      eventId: "evt_1",
    });
    expect(paid.duplicate).toBe(false);

    const duplicateEvent = await repo.markPaid({
      bookingId: first.bookingId,
      provider: "demo",
      providerRef: "demo:right-2",
      amountCents: 22000,
      eventId: "evt_1",
    });
    expect(duplicateEvent.duplicate).toBe(true);

    await repo.addInternalNote("dispatch@example.com", first.bookingId, "carrier cost secret 999");
    const tracking = await repo.getPublicTracking((await trackingToken(first.bookingId)));
    expect(JSON.stringify(tracking)).not.toContain("secret");
    expect(String(tracking?.booking.status)).toBe("confirmed");

    await expect(repo.transitionBooking({
      actor: "dispatch@example.com",
      bookingId: first.bookingId,
      to: "delivered",
      recipientName: "Sam",
    })).rejects.toBeInstanceOf(AppError);
  });
});

async function trackingToken(bookingId: string) {
  const database = await db.getDb();
  const rows = await database.query(`SELECT tracking_token FROM bookings WHERE id = $1`, [bookingId]);
  return String(rows[0].tracking_token);
}
