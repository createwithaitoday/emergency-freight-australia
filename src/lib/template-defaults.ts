export const defaultTemplates: { code: string; channel: "email" | "sms"; subject: string; body: string }[] = [
  {
    code: "customer_request_received",
    channel: "email",
    subject: "Request received {{number}}",
    body: "Hello {{name}},\n\nWe have received delivery request {{number}}. This is not a confirmed booking. We will confirm availability and the price before taking payment.\n\nTrack the request: {{track_url}}\n\n{{brand}}",
  },
  {
    code: "staff_new_request",
    channel: "email",
    subject: "New delivery request {{number}}",
    body: "A new request {{number}} is waiting in dispatch.\nPickup: {{pickup}}\nDelivery: {{delivery}}\nStatus: {{status}}\n{{admin_url}}",
  },
  {
    code: "quote_sent",
    channel: "email",
    subject: "Delivery price ready {{number}}",
    body: "Hello {{name}},\n\nA price is ready for {{number}}: {{total}}. {{gst}}\nThis price expires {{expires}}. Paying it confirms you accept that price and the terms. It is not a confirmed job until payment is verified and the booking status changes.\n\n{{track_url}}",
  },
  {
    code: "payment_received",
    channel: "email",
    subject: "Payment received {{number}}",
    body: "Hello {{name}},\n\nPayment for {{number}} has been verified. The booking is now confirmed.\n\n{{track_url}}",
  },
  {
    code: "booking_accepted",
    channel: "email",
    subject: "Booking accepted {{number}}",
    body: "Hello {{name}},\n\nBooking {{number}} is accepted. We will update you when a driver is allocated. A driver has not been assigned by this message unless the status says so.\n\n{{track_url}}",
  },
  {
    code: "driver_allocated",
    channel: "email",
    subject: "Driver allocated {{number}}",
    body: "Hello {{name}},\n\nA driver has been allocated to {{number}}. {{eta}}\n\n{{track_url}}",
  },
  {
    code: "driver_allocated",
    channel: "sms",
    subject: "",
    body: "{{brand}}: a driver is allocated to {{number}}. {{track_url}}",
  },
  {
    code: "pickup_completed",
    channel: "email",
    subject: "Freight collected {{number}}",
    body: "Hello {{name}},\n\nThe freight for {{number}} has been collected.\n\n{{track_url}}",
  },
  {
    code: "in_transit",
    channel: "email",
    subject: "Delivery in transit {{number}}",
    body: "Hello {{name}},\n\n{{number}} is in transit. {{eta}}\n\n{{track_url}}",
  },
  {
    code: "delivered",
    channel: "email",
    subject: "Delivered {{number}}",
    body: "Hello {{name}},\n\n{{number}} is marked delivered. Proof of delivery is on the tracking page when it has been recorded.\n\n{{track_url}}",
  },
  {
    code: "delivered",
    channel: "sms",
    subject: "",
    body: "{{brand}}: {{number}} is marked delivered. {{track_url}}",
  },
  {
    code: "exception",
    channel: "email",
    subject: "Delivery exception {{number}}",
    body: "Hello {{name}},\n\nThere is an exception on {{number}}. Dispatch will contact you with the next step. The previous delivery estimate no longer applies.\n\n{{track_url}}",
  },
  {
    code: "cancelled",
    channel: "email",
    subject: "Booking cancelled {{number}}",
    body: "Hello {{name}},\n\n{{number}} is cancelled. If a refund applies under the cancellation terms, it will be processed separately and this email is not itself a refund.\n\n{{track_url}}",
  },
  {
    code: "declined",
    channel: "email",
    subject: "Request declined {{number}}",
    body: "Hello {{name}},\n\nWe cannot accept {{number}}. No payment has been taken for a declined request unless a separate receipt says otherwise.\n\n{{brand}}",
  },
  {
    code: "magic_link",
    channel: "email",
    subject: "Your sign-in link",
    body: "Hello,\n\nUse this link to open your {{brand}} account. It expires in 30 minutes and can be used once.\n\n{{link}}\n\nIf you did not ask for this, ignore the email.",
  },
];

