import { brand } from "@/lib/brand";

export function paypalBase() {
  return process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export async function paypalAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) return null;
  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) return null;
  const body = await response.json() as { access_token?: string };
  return body.access_token ?? null;
}

export function paypalAmount(cents: number) {
  return (cents / 100).toFixed(2);
}

export function paypalReturnUrl(trackingToken: string) {
  return `${brand.url.replace(/\/$/, "")}/api/payments/paypal/capture?booking=${encodeURIComponent(trackingToken)}`;
}
