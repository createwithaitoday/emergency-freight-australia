export const BOOKING_STATUSES = [
  "new_request",
  "awaiting_price_confirmation",
  "awaiting_availability",
  "awaiting_payment",
  "confirmed",
  "driver_allocated",
  "collected",
  "in_transit",
  "delivered",
  "failed",
  "cancelled",
  "declined",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PUBLIC_STATUS: Record<BookingStatus, string> = {
  new_request: "Request received",
  awaiting_price_confirmation: "Awaiting price confirmation",
  awaiting_availability: "Awaiting availability confirmation",
  awaiting_payment: "Awaiting payment",
  confirmed: "Booking confirmed",
  driver_allocated: "Driver allocated",
  collected: "Collected",
  in_transit: "In transit",
  delivered: "Delivered",
  failed: "Delivery exception",
  cancelled: "Cancelled",
  declined: "Declined",
};

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  new_request: ["awaiting_price_confirmation", "awaiting_availability", "awaiting_payment", "declined", "cancelled"],
  awaiting_price_confirmation: ["awaiting_availability", "awaiting_payment", "declined", "cancelled"],
  awaiting_availability: ["awaiting_price_confirmation", "awaiting_payment", "declined", "cancelled"],
  awaiting_payment: ["confirmed", "awaiting_availability", "cancelled"],
  confirmed: ["driver_allocated", "cancelled"],
  driver_allocated: ["collected", "failed", "cancelled"],
  collected: ["in_transit", "failed"],
  in_transit: ["delivered", "failed"],
  delivered: [],
  failed: ["cancelled"],
  cancelled: [],
  declined: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus) {
  return TRANSITIONS[from].includes(to);
}

export function initialStatus(payable: boolean): BookingStatus {
  return payable ? "awaiting_payment" : "new_request";
}

/** Templates that may be sent only after the matching status is stored. */
export function templatesForTransition(to: BookingStatus, from: BookingStatus | null, paymentStatus: string) {
  if (from === null) return ["customer_request_received", "staff_new_request"];
  switch (to) {
    case "awaiting_payment":
      return ["quote_sent"];
    case "confirmed":
      return paymentStatus === "paid" ? ["payment_received", "booking_accepted"] : ["booking_accepted"];
    case "driver_allocated":
      return ["driver_allocated"];
    case "collected":
      return ["pickup_completed"];
    case "in_transit":
      return ["in_transit"];
    case "delivered":
      return ["delivered"];
    case "failed":
      return ["exception"];
    case "cancelled":
      return ["cancelled"];
    case "declined":
      return ["declined"];
    default:
      return [];
  }
}

export function customerMayCancel(status: BookingStatus) {
  return (
    status === "new_request" ||
    status === "awaiting_price_confirmation" ||
    status === "awaiting_availability" ||
    status === "awaiting_payment"
  );
}
