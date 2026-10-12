# Emergency Freight Australia

Urgent courier and hotshot delivery site for Australian commercial freight. Customers can price a route, lodge a request, and pay only when the price is confirmed. Dispatch keeps control of jobs whose distance, carrier cost or deadline is not yet safe to accept.

The working brand, phone number, email, domain and ABN live in `src/lib/brand.ts` and the `NEXT_PUBLIC_*` variables in `.env.example`.

## What is deliberately not claimed

Launch rates are assumptions for testing. They are not verified carrier buy-rates. Automatic acceptance stays off until `PRICING_AUTO_ACCEPT=true` and the rate card flag are both on, and even then only a verified metro job with no special handling can be paid immediately.

The site does not invent a fleet, insurance policy, licence, certification, customer count or guaranteed pickup time. Tracking says “Awaiting availability confirmation” until a person records a driver.

## Run locally

Node.js 20 or newer.

Windows PowerShell:

```powershell
cd "C:\Users\Owner\Documents\emergency couriers"
copy .env.example .env
npm install
npm test
npm run dev
```

Linux or macOS:

```bash
cp .env.example .env
npm install
npm test
npm run dev
```

Open http://localhost:3000.

The first boot creates a local PostgreSQL-compatible database in `data/pglite` and a staff user from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Sign in at `/admin/login` with those values. Change the password before any shared deployment.

`DEMO_PAYMENTS=true` shows a sandbox payment button on a confirmed quote. It is refused when `NODE_ENV=production`.

## Production database

Set `DATABASE_URL` to PostgreSQL. The same SQL in `src/lib/db/schema.sql` runs on boot.

```bash
docker compose up -d
```

```
DATABASE_URL=postgres://efa:efa@localhost:5432/efa
```

Do not use the file database on a serverless host. Run `npm run build` and `npm start` as a long-lived Node process, or point `DATABASE_URL` at a hosted Postgres service.

Windows PowerShell:

```powershell
npm run build
npm start
```

Linux:

```bash
npm run build
npm start
```

## Payments, maps, email

- Stripe test keys: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. The webhook route is `/api/webhooks/stripe`. Amounts are taken from the booking row, not from the browser.
- Driving distance: `GOOGLE_MAPS_API_KEY` or `OPENROUTESERVICE_API_KEY`. Without a key, metro distances are labelled unverified and cannot be confirmed automatically.
- Email: `RESEND_API_KEY` and `EMAIL_FROM`. SMS: Twilio variables in `.env.example`. If they are empty outside production, messages are written to the server log.

## Tests

```bash
npm test
```

Covers the pricing minimums, GST, surcharges, interstate non-acceptance, prohibited freight, status transitions, payment amount checks and duplicate webhook events.
