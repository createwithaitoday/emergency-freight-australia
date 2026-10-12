import { brand } from "@/lib/brand";
import { AppError } from "@/lib/errors";
import { resolveDistance } from "@/lib/geo/distance";
import { hashToken, invoiceNumber, newId, newToken, quoteNumber } from "@/lib/ids";
import { formatAud } from "@/lib/money";
import { notifyCodes } from "@/lib/notifications";
import { applyGst, priceQuote } from "@/lib/pricing/engine";
import { defaultPricing } from "@/lib/pricing/defaults";
import type { PricingConfig, QuoteInput, ServiceQuote } from "@/lib/pricing/types";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import {
  canTransition,
  customerMayCancel,
  initialStatus,
  PUBLIC_STATUS,
  templatesForTransition,
  type BookingStatus,
} from "@/lib/workflow";
import { getDb, type Sql } from "@/lib/db/client";

export interface BookingDraft extends QuoteInput {
  serviceCode: string;
  idempotencyKey: string;
  description: string;
  dgDeclaration: string;
  contactName: string;
  businessName: string;
  email: string;
  phone: string;
  pickupContact: string;
  deliveryContact: string;
  accessInstructions: string;
  purchaseOrder: string;
  specialRequirements: string;
  utm: Record<string, string>;
}

export async function getStoredPricing(): Promise<PricingConfig> {
  const db = await getDb();
  const rows = await db.query(`SELECT config_json FROM pricing_config ORDER BY version DESC LIMIT 1`);
  if (!rows[0]) return defaultPricing;
  const parsed = JSON.parse(String(rows[0].config_json)) as PricingConfig;
  return {
    ...defaultPricing,
    ...parsed,
    surcharges: { ...defaultPricing.surcharges, ...parsed.surcharges },
    services: parsed.services?.length ? parsed.services : defaultPricing.services,
    vehicles: parsed.vehicles?.length ? parsed.vehicles : defaultPricing.vehicles,
  };
}

export async function getEffectivePricing() {
  const stored = await getStoredPricing();
  return {
    ...stored,
    autoAcceptEnabled: stored.autoAcceptEnabled && process.env.PRICING_AUTO_ACCEPT === "true",
  };
}

export async function savePricing(config: PricingConfig, actor: string) {
  validatePricing(config);
  const db = await getDb();
  const current = await db.query(`SELECT COALESCE(MAX(version), 0) AS version FROM pricing_config`);
  const version = Number(current[0]?.version ?? 0) + 1;
  await db.query(
    `INSERT INTO pricing_config (id, version, config_json, updated_by) VALUES ($1,$2,$3,$4)`,
    [newId(), version, JSON.stringify(config), actor],
  );
  await audit(actor, "pricing_updated", "pricing_config", String(version), `Saved rate card version ${version}`);
  return version;
}

export async function quoteDraft(input: QuoteInput) {
  const distance = await resolveDistance({
    pickupAddress: input.pickupAddress,
    pickupSuburb: input.pickupSuburb,
    pickupPostcode: input.pickupPostcode,
    deliveryAddress: input.deliveryAddress,
    deliverySuburb: input.deliverySuburb,
    deliveryPostcode: input.deliveryPostcode,
  });
  const priced = priceQuote(input, distance, await getEffectivePricing());
  return { ...priced, distance };
}

export async function createBooking(draft: BookingDraft) {
  const db = await getDb();
  const existing = await db.query(
    `SELECT b.id, b.tracking_token, b.status, q.public_number FROM bookings b JOIN quotes q ON q.id = b.quote_id WHERE b.idempotency_key = $1`,
    [draft.idempotencyKey],
  );
  if (existing[0]) {
    return {
      bookingId: String(existing[0].id),
      trackingToken: String(existing[0].tracking_token),
      status: String(existing[0].status),
      number: String(existing[0].public_number),
      duplicate: true,
    };
  }

  const fullDistance = await resolveDistance({
    pickupAddress: draft.pickupAddress,
    pickupSuburb: draft.pickupSuburb,
    pickupPostcode: draft.pickupPostcode,
    deliveryAddress: draft.deliveryAddress,
    deliverySuburb: draft.deliverySuburb,
    deliveryPostcode: draft.deliveryPostcode,
  });
  const priced = priceQuote(draft, fullDistance, await getEffectivePricing());
  if (priced.blockedReason) throw new AppError(priced.blockedReason, 422);
  const option = priced.options.find((item) => item.serviceCode === draft.serviceCode) ?? priced.options[0];
  if (!option) throw new AppError("No service can be priced for this request", 422);
  if (draft.dangerousGoods && draft.dgDeclaration.trim().length < 8) {
    throw new AppError("Dangerous goods need a written declaration before the request can be lodged.");
  }

  const status = initialStatus(option.payable);
  const trackingToken = newToken();
  const bookingId = newId();
  const quoteId = newId();
  const requestId = newId();
  const number = quoteNumber();

  await db.transaction(async (query) => {
    const customerId = await upsertCustomer(query, draft);
    await query(
      `INSERT INTO delivery_requests (
        id, customer_id, contact_name, contact_email, contact_phone, business_name,
        pickup_address, pickup_suburb, pickup_postcode, delivery_address, delivery_suburb, delivery_postcode,
        extra_stops, urgency, deadline_at, pickup_contact, delivery_contact, access_instructions,
        purchase_order, special_requirements, terms_accepted_at, utm_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),$21)`,
      [
        requestId, customerId, draft.contactName, draft.email, draft.phone, draft.businessName || null,
        draft.pickupAddress || draft.pickupPostcode,
        draft.pickupSuburb || null, draft.pickupPostcode,
        draft.deliveryAddress || draft.deliveryPostcode,
        draft.deliverySuburb || null, draft.deliveryPostcode, draft.extraStops, draft.urgency, draft.deadline || null,
        draft.pickupContact || null, draft.deliveryContact || null, draft.accessInstructions || null,
        draft.purchaseOrder || null, draft.specialRequirements || null, JSON.stringify(draft.utm ?? {}),
      ],
    );
    await query(
      `INSERT INTO freight_items (
        id, delivery_request_id, description, category, packages, weight_grams, length_mm, width_mm, height_mm,
        fragile, palletised, forklift_required, tail_lift_required, loading_assistance, dangerous_goods, dg_declaration, value_cents
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        newId(), requestId, draft.description, draft.category, draft.packages,
        Math.round(draft.weightPerPackageKg * 1000), Math.round(draft.lengthCm * 10), Math.round(draft.widthCm * 10),
        Math.round(draft.heightCm * 10), draft.fragile, draft.palletised, draft.forkliftRequired, draft.tailLiftRequired,
        draft.loadingAssistance, draft.dangerousGoods, draft.dgDeclaration || null, draft.goodsValueCents,
      ],
    );
    await query(
      `INSERT INTO quotes (
        id, public_number, delivery_request_id, service_code, service_name, status, distance_metres, distance_source,
        distance_label, subtotal_cents, gst_cents, total_cents, prices_include_gst, gst_registered, payable, calculated, expires_at, snapshot_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        quoteId, number, requestId, option.serviceCode, option.serviceName,
        option.status, option.distanceKm == null ? null : Math.round(option.distanceKm * 1000), option.distanceSource,
        option.distanceLabel, option.subtotalCents, option.gstCents, option.totalCents, option.pricesIncludeGst,
        option.gstRegistered, option.payable, option.calculated, option.expiresAt, JSON.stringify(option),
      ],
    );
    for (const line of option.lines) {
      await query(
        `INSERT INTO quote_line_items (id, quote_id, code, description, amount_cents) VALUES ($1,$2,$3,$4,$5)`,
        [newId(), quoteId, line.code, line.description, line.amountCents],
      );
    }
    await query(
      `INSERT INTO bookings (
        id, quote_id, delivery_request_id, customer_id, tracking_token, idempotency_key, status, payment_status,
        selling_net_cents, selling_gst_cents, selling_total_cents
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'unpaid',$8,$9,$10)`,
      [bookingId, quoteId, requestId, customerId, trackingToken, draft.idempotencyKey, status, option.subtotalCents, option.gstCents, option.totalCents],
    );
    await query(
      `INSERT INTO status_events (id, booking_id, from_status, to_status, note, actor) VALUES ($1,$2,NULL,$3,$4,$5)`,
      [newId(), bookingId, status, "Request lodged", draft.email],
    );
    await query(
      `INSERT INTO tracking_records (id, booking_id, message, is_public) VALUES ($1,$2,$3,TRUE)`,
      [newId(), bookingId, "Request received. Availability and the final price are still to be confirmed unless the status says otherwise."],
    );
  });

  const templates = templatesForTransition(status, null, "unpaid").filter((code) => code !== "staff_new_request");
  if (status === "awaiting_payment") templates.push("quote_sent");
  await sendForBooking(bookingId, templates);
  await sendForBooking(bookingId, ["staff_new_request"]);
  return { bookingId, trackingToken, status, number, duplicate: false, option };
}

export async function setSellingPrice(actor: string, bookingId: string, netCents: number, overrideReason?: string) {
  if (!Number.isInteger(netCents) || netCents <= 0) throw new AppError("Enter a selling price in cents.");
  const config = await getStoredPricing();
  if (netCents < config.minimumViableSellingCents && !overrideReason?.trim()) {
    throw new AppError("That price is below the minimum viable selling price. Record an override reason to continue.");
  }
  const tax = applyGst(netCents, config);
  const db = await getDb();
  const changed = await db.transaction(async (query) => {
    const rows = await query(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
    const booking = rows[0];
    if (!booking) throw new AppError("Booking not found", 404);
    const from = String(booking.status) as BookingStatus;
    const expires = new Date(Date.now() + config.quoteExpiryHours * 3600_000).toISOString();
    await query(
      `UPDATE quotes SET subtotal_cents = $2, gst_cents = $3, total_cents = $4, payable = TRUE, status = 'confirmed', expires_at = $5 WHERE id = $1`,
      [booking.quote_id, tax.netCents, tax.gstCents, tax.totalCents, expires],
    );
    await query(
      `UPDATE bookings SET selling_net_cents = $2, selling_gst_cents = $3, selling_total_cents = $4, updated_at = NOW() WHERE id = $1`,
      [bookingId, tax.netCents, tax.gstCents, tax.totalCents],
    );
    let to = from;
    if (from !== "awaiting_payment" && canTransition(from, "awaiting_payment")) {
      to = "awaiting_payment";
      await moveStatus(query, bookingId, from, to, actor, overrideReason ? `Price approved with override: ${overrideReason}` : "Price approved for payment");
      await query(
        `INSERT INTO tracking_records (id, booking_id, message, is_public) VALUES ($1,$2,$3,TRUE)`,
        [newId(), bookingId, `A price of ${formatAud(tax.totalCents)} is ready. The booking is confirmed only after payment is verified.`],
      );
    }
    return { from, to, changed: to !== from };
  });
  await audit(actor, "price_approved", "booking", bookingId, overrideReason || `Ex-GST ${netCents}`);
  if (changed.changed) await sendForBooking(bookingId, templatesForTransition("awaiting_payment", changed.from, "unpaid"));
  return tax;
}

export async function transitionBooking(input: {
  actor: string;
  bookingId: string;
  to: BookingStatus;
  note?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  carrierName?: string;
  carrierCostCents?: number;
  eta?: string;
  recipientName?: string;
  onAccount?: boolean;
}) {
  const db = await getDb();
  const result = await db.transaction(async (query) => {
    const rows = await query(`SELECT * FROM bookings WHERE id = $1`, [input.bookingId]);
    const booking = rows[0];
    if (!booking) throw new AppError("Booking not found", 404);
    const from = String(booking.status) as BookingStatus;
    if (!canTransition(from, input.to)) throw new AppError(`Cannot move a booking from ${from} to ${input.to}.`);
    if (input.to === "confirmed") {
      const paid = String(booking.payment_status) === "paid" || input.onAccount;
      if (!paid) throw new AppError("Confirm the booking only after payment is verified, or approved account terms are applied.");
      if (input.onAccount) {
        await query(`UPDATE bookings SET payment_status = 'on_account', updated_at = NOW() WHERE id = $1`, [input.bookingId]);
      }
    }
    if (input.to === "driver_allocated") {
      if (!input.driverId && !input.driverName?.trim()) throw new AppError("Enter the driver before allocating one.");
      const driverId = input.driverId || (await createDriver(query, input.driverName!.trim(), input.driverPhone, input.carrierName));
      await query(
        `INSERT INTO dispatch_assignments (id, booking_id, driver_id, carrier_cost_cents, notes) VALUES ($1,$2,$3,$4,$5)`,
        [newId(), input.bookingId, driverId, input.carrierCostCents ?? null, input.note ?? null],
      );
      if (input.carrierCostCents != null) {
        await query(`UPDATE bookings SET carrier_cost_cents = $2 WHERE id = $1`, [input.bookingId, input.carrierCostCents]);
      }
    }
    if (input.to === "delivered") {
      if (!input.recipientName?.trim()) throw new AppError("Record who received the freight before marking it delivered.");
      await query(
        `INSERT INTO proof_of_delivery (id, booking_id, recipient_name, notes) VALUES ($1,$2,$3,$4)`,
        [newId(), input.bookingId, input.recipientName.trim(), input.note ?? null],
      );
    }
    if (input.eta) await query(`UPDATE bookings SET customer_eta = $2 WHERE id = $1`, [input.bookingId, input.eta]);
    if (input.carrierCostCents != null && input.to !== "driver_allocated") {
      await query(`UPDATE bookings SET carrier_cost_cents = $2 WHERE id = $1`, [input.bookingId, input.carrierCostCents]);
    }
    await moveStatus(query, input.bookingId, from, input.to, input.actor, input.note);
    const message = publicMessage(input.to, input.eta);
    if (message) {
      await query(`INSERT INTO tracking_records (id, booking_id, message, is_public) VALUES ($1,$2,$3,TRUE)`, [newId(), input.bookingId, message]);
    }
    return { from, paymentStatus: input.onAccount ? "on_account" : String(booking.payment_status) };
  });
  await audit(input.actor, "status_changed", "booking", input.bookingId, `${result.from} -> ${input.to}`);
  await sendForBooking(input.bookingId, templatesForTransition(input.to, result.from, result.paymentStatus));
}

export async function addInternalNote(actor: string, bookingId: string, note: string) {
  const db = await getDb();
  await db.query(`UPDATE bookings SET internal_notes = $2, updated_at = NOW() WHERE id = $1`, [bookingId, note]);
  await audit(actor, "note_added", "booking", bookingId, note.slice(0, 240));
}

export async function markPaid(input: {
  bookingId: string;
  provider: string;
  providerRef: string;
  amountCents: number;
  eventId?: string;
  actor?: string;
}) {
  const db = await getDb();
  const result = await db.transaction(async (query) => {
    if (input.eventId) {
      const inserted = await query(
        `INSERT INTO webhook_events (id, provider, event_id) VALUES ($1,$2,$3) ON CONFLICT (event_id) DO NOTHING RETURNING id`,
        [newId(), input.provider, input.eventId],
      );
      if (!inserted[0]) return { duplicate: true as const, changed: false, from: "awaiting_payment" as BookingStatus };
    }
    const existingPayment = await query(`SELECT id FROM payments WHERE provider = $1 AND provider_ref = $2`, [input.provider, input.providerRef]);
    if (existingPayment[0]) return { duplicate: true as const, changed: false, from: "awaiting_payment" as BookingStatus };
    const rows = await query(`SELECT * FROM bookings WHERE id = $1`, [input.bookingId]);
    const booking = rows[0];
    if (!booking) throw new AppError("Booking not found", 404);
    if (String(booking.payment_status) === "paid") return { duplicate: true as const, changed: false, from: String(booking.status) as BookingStatus };
    if (Number(booking.selling_total_cents) !== input.amountCents) {
      throw new AppError("Payment amount does not match the booking total", 409);
    }
    const quoteRows = await query(`SELECT payable, expires_at FROM quotes WHERE id = $1`, [booking.quote_id]);
    const quote = quoteRows[0];
    if (!isTrue(quote?.payable)) throw new AppError("This price is not confirmed for payment", 409);
    if (quote?.expires_at && new Date(String(quote.expires_at)).getTime() < Date.now()) throw new AppError("This quote has expired", 409);
    const from = String(booking.status) as BookingStatus;
    if (from !== "awaiting_payment") throw new AppError("This booking is not awaiting payment", 409);
    await query(
      `INSERT INTO payments (id, booking_id, provider, provider_ref, amount_cents, status) VALUES ($1,$2,$3,$4,$5,'paid')`,
      [newId(), input.bookingId, input.provider, input.providerRef, input.amountCents],
    );
    await query(`UPDATE bookings SET payment_status = 'paid', updated_at = NOW() WHERE id = $1`, [input.bookingId]);
    await moveStatus(query, input.bookingId, from, "confirmed", input.actor ?? input.provider, "Payment verified");
    await query(
      `INSERT INTO tracking_records (id, booking_id, message, is_public) VALUES ($1,$2,$3,TRUE)`,
      [newId(), input.bookingId, "Payment verified. Booking confirmed."],
    );
    await query(
      `INSERT INTO invoices (id, booking_id, number, subtotal_cents, gst_cents, total_cents) VALUES ($1,$2,$3,$4,$5,$6)`,
      [newId(), input.bookingId, invoiceNumber(), booking.selling_net_cents, booking.selling_gst_cents, booking.selling_total_cents],
    );
    return { duplicate: false as const, changed: true, from };
  });
  if (result.changed) await sendForBooking(input.bookingId, templatesForTransition("confirmed", result.from, "paid"));
  return result;
}

export async function refundBooking(actor: string, bookingId: string, amountCents: number, reason: string) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new AppError("Enter a refund amount.");
  const db = await getDb();
  await db.transaction(async (query) => {
    const rows = await query(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
    const booking = rows[0];
    if (!booking) throw new AppError("Booking not found", 404);
    const paid = Number(booking.selling_total_cents);
    const already = await query(`SELECT COALESCE(SUM(amount_cents), 0) AS total FROM payments WHERE booking_id = $1 AND status = 'refunded'`, [bookingId]);
    const refunded = Math.abs(Number(already[0]?.total ?? 0));
    if (refunded + amountCents > paid) throw new AppError("Refund is larger than the amount paid.");
    await query(
      `INSERT INTO payments (id, booking_id, provider, provider_ref, amount_cents, status) VALUES ($1,$2,'manual',$3,$4,'refunded')`,
      [newId(), bookingId, `refund:${newId()}`, -amountCents],
    );
    const full = refunded + amountCents === paid;
    await query(`UPDATE bookings SET payment_status = $2, updated_at = NOW() WHERE id = $1`, [bookingId, full ? "refunded" : "partially_refunded"]);
  });
  await audit(actor, "refund_recorded", "booking", bookingId, `${amountCents} ${reason}`);
}

export async function cancelByToken(token: string, reason: string) {
  const booking = await getAdminBookingByToken(token);
  if (!booking) throw new AppError("Booking not found", 404);
  if (!customerMayCancel(booking.status)) {
    throw new AppError("This booking can no longer be cancelled online. Contact dispatch and refer to the cancellation terms.");
  }
  await transitionBooking({ actor: booking.email || "customer", bookingId: booking.id, to: "cancelled", note: reason || "Customer cancelled" });
}

export async function listBookings(status = "", search = "") {
  const db = await getDb();
  const needle = `%${search.replace(/[%_]/g, "").trim()}%`;
  return db.query(
    `SELECT b.id, b.status, b.payment_status, b.created_at, b.selling_total_cents, b.selling_net_cents, b.carrier_cost_cents,
            b.payment_fee_cents, b.customer_eta, b.acquisition_cost_cents, q.public_number, q.service_name, q.service_code, q.payable,
            d.contact_name, d.contact_email, d.pickup_suburb, d.pickup_postcode, d.delivery_suburb, d.delivery_postcode, d.urgency
     FROM bookings b
     JOIN quotes q ON q.id = b.quote_id
     JOIN delivery_requests d ON d.id = b.delivery_request_id
     WHERE ($1 = '' OR b.status = $1)
       AND ($2 = '%%' OR q.public_number ILIKE $2 OR d.contact_email ILIKE $2 OR COALESCE(d.pickup_suburb,'') ILIKE $2
            OR COALESCE(d.delivery_suburb,'') ILIKE $2 OR COALESCE(d.contact_name,'') ILIKE $2)
     ORDER BY b.created_at DESC
     LIMIT 200`,
    [status, needle],
  );
}

export async function getAdminBooking(id: string) {
  const db = await getDb();
  const rows = await db.query(
    `SELECT b.*, q.public_number, q.service_name, q.service_code, q.snapshot_json, q.payable, q.expires_at, q.distance_label,
            q.subtotal_cents AS quote_net, q.gst_cents AS quote_gst, q.total_cents AS quote_total, q.calculated,
            d.contact_name, d.contact_email, d.contact_phone, d.business_name, d.pickup_suburb, d.pickup_postcode,
            d.delivery_suburb, d.delivery_postcode, d.urgency, d.deadline_at, d.pickup_contact, d.delivery_contact,
            d.access_instructions, d.purchase_order, d.special_requirements, d.extra_stops,
            f.description AS freight_description, f.category, f.packages, f.weight_grams, f.dangerous_goods, f.dg_declaration, f.value_cents
     FROM bookings b
     JOIN quotes q ON q.id = b.quote_id
     JOIN delivery_requests d ON d.id = b.delivery_request_id
     LEFT JOIN freight_items f ON f.delivery_request_id = d.id
     WHERE b.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const events = await db.query(`SELECT from_status, to_status, note, actor, created_at FROM status_events WHERE booking_id = $1 ORDER BY created_at`, [id]);
  const lines = await db.query(`SELECT code, description, amount_cents FROM quote_line_items WHERE quote_id = $1`, [rows[0].quote_id]);
  const drivers = await db.query(`SELECT id, name, phone FROM drivers WHERE active = TRUE ORDER BY name`);
  const pod = await db.query(`SELECT recipient_name, notes, recorded_at FROM proof_of_delivery WHERE booking_id = $1 ORDER BY recorded_at DESC LIMIT 1`, [id]);
  return { booking: rows[0], events, lines, drivers, pod: pod[0] ?? null };
}

export async function getPublicTracking(token: string) {
  const db = await getDb();
  const rows = await db.query(
    `SELECT b.status, b.payment_status, b.customer_eta, b.selling_total_cents, b.selling_gst_cents, b.selling_net_cents,
            q.public_number, q.service_name, q.payable, q.status AS quote_status, q.expires_at, q.calculated, q.gst_registered,
            d.pickup_suburb, d.pickup_postcode, d.delivery_suburb, d.delivery_postcode
     FROM bookings b
     JOIN quotes q ON q.id = b.quote_id
     JOIN delivery_requests d ON d.id = b.delivery_request_id
     WHERE b.tracking_token = $1`,
    [token],
  );
  if (!rows[0]) return null;
  const idRow = await db.query(`SELECT id FROM bookings WHERE tracking_token = $1`, [token]);
  const id = String(idRow[0].id);
  const events = await db.query(
    `SELECT message, created_at FROM tracking_records WHERE booking_id = $1 AND is_public = TRUE ORDER BY created_at`,
    [id],
  );
  const pod = await db.query(`SELECT recipient_name, recorded_at FROM proof_of_delivery WHERE booking_id = $1 ORDER BY recorded_at DESC LIMIT 1`, [id]);
  const invoice = await db.query(`SELECT number, total_cents, issued_at FROM invoices WHERE booking_id = $1 LIMIT 1`, [id]);
  return { booking: rows[0], events, pod: pod[0] ?? null, invoice: invoice[0] ?? null };
}

async function getAdminBookingByToken(token: string) {
  const db = await getDb();
  const rows = await db.query(
    `SELECT b.id, b.status, d.contact_email AS email FROM bookings b JOIN delivery_requests d ON d.id = b.delivery_request_id WHERE b.tracking_token = $1`,
    [token],
  );
  if (!rows[0]) return null;
  return { id: String(rows[0].id), status: String(rows[0].status) as BookingStatus, email: String(rows[0].email ?? "") };
}

export async function createMagicLink(email: string) {
  const db = await getDb();
  const token = newToken();
  const expires = new Date(Date.now() + 30 * 60_000).toISOString();
  await db.query(`INSERT INTO magic_links (id, email, token_hash, expires_at) VALUES ($1,$2,$3,$4)`, [newId(), email.toLowerCase(), hashToken(token), expires]);
  return token;
}

export async function consumeMagicLink(token: string) {
  const db = await getDb();
  return db.transaction(async (query) => {
    const rows = await query(`SELECT * FROM magic_links WHERE token_hash = $1`, [hashToken(token)]);
    const link = rows[0];
    if (!link || link.used_at || new Date(String(link.expires_at)).getTime() < Date.now()) return null;
    await query(`UPDATE magic_links SET used_at = NOW() WHERE id = $1`, [link.id]);
    const email = String(link.email);
    let customer = await query(`SELECT id FROM customers WHERE email = $1`, [email]);
    if (!customer[0]) {
      const id = newId();
      await query(`INSERT INTO customers (id, email) VALUES ($1,$2)`, [id, email]);
      customer = [{ id }];
    }
    const session = newToken();
    await query(
      `INSERT INTO sessions (id, kind, subject_id, token_hash, expires_at) VALUES ($1,'customer',$2,$3,$4)`,
      [newId(), customer[0].id, hashToken(session), new Date(Date.now() + 30 * 86400_000).toISOString()],
    );
    return { session, email, customerId: String(customer[0].id) };
  });
}

export async function loginAdmin(email: string, password: string) {
  const db = await getDb();
  const rows = await db.query(`SELECT * FROM admin_users WHERE email = $1`, [email.toLowerCase()]);
  const admin = rows[0];
  if (!admin || !(await verifyPassword(password, String(admin.password_hash)))) return null;
  const session = newToken();
  await db.query(
    `INSERT INTO sessions (id, kind, subject_id, token_hash, expires_at) VALUES ($1,'admin',$2,$3,$4)`,
    [newId(), admin.id, hashToken(session), new Date(Date.now() + 12 * 3600_000).toISOString()],
  );
  return { session, id: String(admin.id), email: String(admin.email), role: String(admin.role), name: String(admin.name) };
}

export async function sessionSubject(kind: "admin" | "customer", token: string) {
  const db = await getDb();
  const rows = await db.query(
    `SELECT subject_id, expires_at FROM sessions WHERE kind = $1 AND token_hash = $2`,
    [kind, hashToken(token)],
  );
  const row = rows[0];
  if (!row || new Date(String(row.expires_at)).getTime() < Date.now()) return null;
  if (kind === "admin") {
    const admin = await db.query(`SELECT id, email, name, role FROM admin_users WHERE id = $1`, [row.subject_id]);
    return admin[0] ?? null;
  }
  const customer = await db.query(`SELECT id, email, name, phone, business_name FROM customers WHERE id = $1`, [row.subject_id]);
  return customer[0] ?? null;
}

export async function deleteSession(kind: string, token: string) {
  const db = await getDb();
  await db.query(`DELETE FROM sessions WHERE kind = $1 AND token_hash = $2`, [kind, hashToken(token)]);
}

export async function customerBookings(customerId: string) {
  const db = await getDb();
  return db.query(
    `SELECT b.id, b.status, b.payment_status, b.tracking_token, b.created_at, b.selling_total_cents, q.public_number, q.service_name,
            d.pickup_suburb, d.pickup_postcode, d.delivery_suburb, d.delivery_postcode
     FROM bookings b
     JOIN quotes q ON q.id = b.quote_id
     JOIN delivery_requests d ON d.id = b.delivery_request_id
     WHERE b.customer_id = $1
     ORDER BY b.created_at DESC`,
    [customerId],
  );
}

export async function saveAddress(customerId: string, input: { label: string; line1: string; suburb: string; postcode: string; instructions: string }) {
  const db = await getDb();
  await db.query(
    `INSERT INTO addresses (id, customer_id, label, line1, suburb, postcode, instructions) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [newId(), customerId, input.label, input.line1, input.suburb, input.postcode, input.instructions],
  );
}

export async function listAddresses(customerId: string) {
  const db = await getDb();
  return db.query(`SELECT id, label, line1, suburb, postcode, instructions FROM addresses WHERE customer_id = $1 ORDER BY created_at DESC`, [customerId]);
}

export async function applyForBusiness(customerId: string, input: { legalName: string; abn: string; notes: string }) {
  const db = await getDb();
  const id = newId();
  await db.query(
    `INSERT INTO business_accounts (id, customer_id, legal_name, abn, notes) VALUES ($1,$2,$3,$4,$5)`,
    [id, customerId, input.legalName, input.abn || null, input.notes || null],
  );
  await db.query(`INSERT INTO business_users (id, business_account_id, customer_id, role) VALUES ($1,$2,$3,'owner')`, [newId(), id, customerId]);
  await audit(customerId, "business_application", "business_account", id, input.legalName);
  return id;
}

export async function listBusiness(customerId: string) {
  const db = await getDb();
  return db.query(`SELECT id, legal_name, abn, status, credit_terms_approved, payment_terms_days, created_at FROM business_accounts WHERE customer_id = $1 ORDER BY created_at DESC`, [customerId]);
}

export async function listAudit() {
  const db = await getDb();
  return db.query(`SELECT actor_email, action, entity, entity_id, detail, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 200`);
}

export async function financeRows() {
  const db = await getDb();
  return db.query(
    `SELECT b.id, b.status, b.payment_status, b.selling_net_cents, b.selling_gst_cents, b.selling_total_cents,
            b.carrier_cost_cents, b.payment_fee_cents, b.acquisition_cost_cents, q.service_code, q.public_number,
            d.pickup_postcode, d.delivery_postcode
     FROM bookings b
     JOIN quotes q ON q.id = b.quote_id
     JOIN delivery_requests d ON d.id = b.delivery_request_id
     ORDER BY b.created_at DESC
     LIMIT 500`,
  );
}

export async function listTemplates() {
  const db = await getDb();
  return db.query(`SELECT code, channel, subject, body FROM message_templates ORDER BY code, channel`);
}

export async function saveTemplate(code: string, channel: string, subject: string, body: string, actor: string) {
  const db = await getDb();
  await db.query(
    `UPDATE message_templates SET subject = $3, body = $4, updated_at = NOW() WHERE code = $1 AND channel = $2`,
    [code, channel, subject, body],
  );
  await audit(actor, "template_updated", "message_templates", `${code}:${channel}`, subject);
}

export async function invoiceForToken(token: string) {
  const db = await getDb();
  const rows = await db.query(
    `SELECT i.number, i.subtotal_cents, i.gst_cents, i.total_cents, i.issued_at, q.public_number, q.service_name, q.gst_registered,
            d.contact_name, d.business_name, d.contact_email, d.pickup_suburb, d.pickup_postcode, d.delivery_suburb, d.delivery_postcode,
            b.payment_status
     FROM bookings b
     JOIN invoices i ON i.booking_id = b.id
     JOIN quotes q ON q.id = b.quote_id
     JOIN delivery_requests d ON d.id = b.delivery_request_id
     WHERE b.tracking_token = $1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function createStaff(actor: string, email: string, name: string, password: string, role: string) {
  const db = await getDb();
  await db.query(
    `INSERT INTO admin_users (id, email, name, password_hash, role) VALUES ($1,$2,$3,$4,$5)`,
    [newId(), email.toLowerCase(), name, await hashPassword(password), role],
  );
  await audit(actor, "admin_created", "admin_users", email, role);
}

async function upsertCustomer(query: Sql, draft: BookingDraft) {
  const email = draft.email.toLowerCase();
  const rows = await query(
    `INSERT INTO customers (id, email, name, phone, business_name) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, business_name = COALESCE(EXCLUDED.business_name, customers.business_name)
     RETURNING id`,
    [newId(), email, draft.contactName, draft.phone, draft.businessName || null],
  );
  return String(rows[0].id);
}

async function createDriver(query: Sql, name: string, phone?: string, carrierName?: string) {
  let carrierId: string | null = null;
  if (carrierName?.trim()) {
    carrierId = newId();
    await query(`INSERT INTO carriers (id, name, phone) VALUES ($1,$2,$3)`, [carrierId, carrierName.trim(), phone ?? null]);
  }
  const id = newId();
  await query(`INSERT INTO drivers (id, name, phone, carrier_id) VALUES ($1,$2,$3,$4)`, [id, name, phone ?? null, carrierId]);
  return id;
}

async function moveStatus(query: Sql, bookingId: string, from: BookingStatus, to: BookingStatus, actor: string, note?: string) {
  await query(`UPDATE bookings SET status = $2, updated_at = NOW() WHERE id = $1`, [bookingId, to]);
  await query(
    `INSERT INTO status_events (id, booking_id, from_status, to_status, note, actor) VALUES ($1,$2,$3,$4,$5,$6)`,
    [newId(), bookingId, from, to, note ?? null, actor],
  );
}

async function sendForBooking(bookingId: string, codes: string[]) {
  if (!codes.length) return;
  const db = await getDb();
  const rows = await db.query(
    `SELECT b.tracking_token, b.customer_eta, b.selling_total_cents, b.selling_gst_cents, b.status,
            q.public_number, q.expires_at, q.gst_registered, d.contact_name, d.contact_email, d.contact_phone,
            d.pickup_suburb, d.pickup_postcode, d.delivery_suburb, d.delivery_postcode
     FROM bookings b
     JOIN quotes q ON q.id = b.quote_id
     JOIN delivery_requests d ON d.id = b.delivery_request_id
     WHERE b.id = $1`,
    [bookingId],
  );
  const row = rows[0];
  if (!row) return;
  const status = String(row.status) as BookingStatus;
  const customerCodes = codes.filter((code) => code !== "staff_new_request");
  const staffCodes = codes.filter((code) => code === "staff_new_request");
  if (customerCodes.length) {
  await notifyCodes(customerCodes, {
    bookingId,
    toEmail: String(row.contact_email),
    toPhone: row.contact_phone ? String(row.contact_phone) : undefined,
    vars: {
      name: String(row.contact_name || "there"),
      number: String(row.public_number),
      total: formatAud(Number(row.selling_total_cents)),
      gst: isTrue(row.gst_registered) ? `GST ${formatAud(Number(row.selling_gst_cents))}.` : "GST is not applicable.",
      expires: row.expires_at ? new Date(String(row.expires_at)).toLocaleString("en-AU", { timeZone: "Australia/Sydney" }) : "",
      track_url: `${brand.url.replace(/\/$/, "")}/track/${row.tracking_token}`,
      admin_url: `${brand.url.replace(/\/$/, "")}/admin/bookings/${bookingId}`,
      pickup: `${row.pickup_suburb ?? ""} ${row.pickup_postcode ?? ""}`.trim(),
      delivery: `${row.delivery_suburb ?? ""} ${row.delivery_postcode ?? ""}`.trim(),
      status: PUBLIC_STATUS[status] ?? status,
      eta: row.customer_eta ? `Estimate recorded by dispatch: ${row.customer_eta}. This is not a guaranteed time.` : "",
      brand: brand.name,
    },
  });
  }
  if (staffCodes.length) {
    await notifyCodes(["staff_new_request"], {
      bookingId,
      toEmail: process.env.DISPATCH_EMAIL || (process.env.NODE_ENV === "production" ? undefined : brand.email),
      vars: {
        number: String(row.public_number),
        pickup: `${row.pickup_suburb ?? ""} ${row.pickup_postcode ?? ""}`.trim(),
        delivery: `${row.delivery_suburb ?? ""} ${row.delivery_postcode ?? ""}`.trim(),
        status: PUBLIC_STATUS[status] ?? status,
        admin_url: `${brand.url.replace(/\/$/, "")}/admin/bookings/${bookingId}`,
        brand: brand.name,
        name: "",
        total: "",
        gst: "",
        expires: "",
        track_url: "",
        eta: "",
      },
    });
  }
}

function publicMessage(status: BookingStatus, eta?: string) {
  switch (status) {
    case "awaiting_availability":
      return "Awaiting availability confirmation.";
    case "awaiting_price_confirmation":
      return "Awaiting price confirmation.";
    case "driver_allocated":
      return eta ? `A driver has been allocated. Dispatch estimate: ${eta}. This is not a guaranteed time.` : "A driver has been allocated.";
    case "collected":
      return "Freight collected.";
    case "in_transit":
      return eta ? `In transit. Dispatch estimate: ${eta}. This is not a guaranteed time.` : "In transit.";
    case "delivered":
      return "Delivered.";
    case "failed":
      return "There is a delivery exception. The earlier estimate no longer applies.";
    case "cancelled":
      return "Booking cancelled.";
    case "declined":
      return "Request declined.";
    default:
      return null;
  }
}

async function audit(actor: string, action: string, entity: string, entityId: string, detail: string) {
  const db = await getDb();
  await db.query(
    `INSERT INTO audit_logs (id, actor_email, action, entity, entity_id, detail) VALUES ($1,$2,$3,$4,$5,$6)`,
    [newId(), actor, action, entity, entityId, detail],
  );
}

function validatePricing(config: PricingConfig) {
  if (!Array.isArray(config.services) || config.services.length < 5) throw new AppError("The rate card needs all five services.");
  for (const service of config.services) {
    if (service.baseFeeCents < 0 || service.perKmCents < 0 || service.minimumCents < 0) throw new AppError("Rates cannot be negative.");
  }
  if (config.gstRate < 0 || config.gstRate > 0.2) throw new AppError("GST rate looks wrong.");
}

function isTrue(value: unknown) {
  return value === true || value === "t" || value === "true";
}

export type { ServiceQuote };
