CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  legal_name TEXT NOT NULL,
  abn TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  credit_terms_approved BOOLEAN NOT NULL DEFAULT FALSE,
  payment_terms_days INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_users (
  id TEXT PRIMARY KEY,
  business_account_id TEXT NOT NULL REFERENCES business_accounts(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  label TEXT,
  line1 TEXT NOT NULL,
  suburb TEXT,
  postcode TEXT NOT NULL,
  state TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_requests (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  business_name TEXT,
  pickup_address TEXT,
  pickup_suburb TEXT,
  pickup_postcode TEXT,
  delivery_address TEXT,
  delivery_suburb TEXT,
  delivery_postcode TEXT,
  extra_stops INTEGER NOT NULL DEFAULT 0,
  urgency TEXT,
  deadline_at TEXT,
  pickup_contact TEXT,
  delivery_contact TEXT,
  access_instructions TEXT,
  purchase_order TEXT,
  special_requirements TEXT,
  terms_accepted_at TIMESTAMPTZ,
  utm_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS freight_items (
  id TEXT PRIMARY KEY,
  delivery_request_id TEXT NOT NULL REFERENCES delivery_requests(id),
  description TEXT,
  category TEXT,
  packages INTEGER,
  weight_grams INTEGER,
  length_mm INTEGER,
  width_mm INTEGER,
  height_mm INTEGER,
  fragile BOOLEAN NOT NULL DEFAULT FALSE,
  palletised BOOLEAN NOT NULL DEFAULT FALSE,
  forklift_required BOOLEAN NOT NULL DEFAULT FALSE,
  tail_lift_required BOOLEAN NOT NULL DEFAULT FALSE,
  loading_assistance BOOLEAN NOT NULL DEFAULT FALSE,
  dangerous_goods BOOLEAN NOT NULL DEFAULT FALSE,
  dg_declaration TEXT,
  value_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pricing_config (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  public_number TEXT UNIQUE NOT NULL,
  delivery_request_id TEXT REFERENCES delivery_requests(id),
  service_code TEXT,
  service_name TEXT,
  status TEXT NOT NULL,
  distance_metres INTEGER,
  distance_source TEXT,
  distance_label TEXT,
  subtotal_cents INTEGER NOT NULL,
  gst_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  prices_include_gst BOOLEAN NOT NULL,
  gst_registered BOOLEAN NOT NULL,
  payable BOOLEAN NOT NULL DEFAULT FALSE,
  calculated BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  snapshot_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_line_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id),
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  quote_id TEXT REFERENCES quotes(id),
  delivery_request_id TEXT REFERENCES delivery_requests(id),
  customer_id TEXT REFERENCES customers(id),
  tracking_token TEXT UNIQUE NOT NULL,
  idempotency_key TEXT UNIQUE,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  selling_net_cents INTEGER NOT NULL,
  selling_gst_cents INTEGER NOT NULL,
  selling_total_cents INTEGER NOT NULL,
  carrier_cost_cents INTEGER,
  payment_fee_cents INTEGER NOT NULL DEFAULT 0,
  acquisition_cost_cents INTEGER,
  internal_notes TEXT,
  customer_eta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  provider TEXT NOT NULL,
  provider_ref TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_ref_idx
  ON payments(provider, provider_ref);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carriers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  carrier_id TEXT REFERENCES carriers(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispatch_assignments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  driver_id TEXT REFERENCES drivers(id),
  carrier_id TEXT REFERENCES carriers(id),
  carrier_cost_cents INTEGER,
  notes TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS status_events (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  actor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracking_records (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  message TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proof_of_delivery (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  recipient_name TEXT,
  notes TEXT,
  file_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  number TEXT UNIQUE NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  gst_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  channel TEXT NOT NULL,
  template TEXT NOT NULL,
  recipient TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magic_links (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_templates (
  code TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (code, channel)
);

CREATE TABLE IF NOT EXISTS stored_files (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  kind TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  original_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);
CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS status_events_booking_idx ON status_events(booking_id);
CREATE INDEX IF NOT EXISTS tracking_booking_idx ON tracking_records(booking_id);
