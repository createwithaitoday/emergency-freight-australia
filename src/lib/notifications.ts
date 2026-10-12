import { brand, absoluteUrl } from "@/lib/brand";
import { getDb } from "@/lib/db/client";
import { newId } from "@/lib/ids";
import { formatAud } from "@/lib/money";

export { defaultTemplates } from "./template-defaults";

type NotifyContext = {
  bookingId?: string;
  toEmail?: string;
  toPhone?: string;
  vars: Record<string, string>;
};

export async function notifyCodes(codes: string[], context: NotifyContext) {
  const db = await getDb();
  for (const code of codes) {
    const templates = await db.query(
      `SELECT channel, subject, body FROM message_templates WHERE code = $1`,
      [code],
    );
    for (const template of templates) {
      const channel = String(template.channel);
      const body = render(String(template.body), context.vars);
      const subject = render(String(template.subject ?? ""), context.vars);
      const recipient = channel === "sms" ? context.toPhone : context.toEmail;
      if (!recipient) continue;
      const result = await deliver(channel, recipient, subject, body);
      await db.query(
        `INSERT INTO notifications (id, booking_id, channel, template, recipient, status, error) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [newId(), context.bookingId ?? null, channel, code, recipient, result.status, result.error],
      );
    }
  }
}

export function render(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

async function deliver(channel: string, to: string, subject: string, body: string) {
  try {
    if (channel === "email" && process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text: body }),
      });
      if (!response.ok) return { status: "failed", error: `Email provider returned ${response.status}` };
      return { status: "sent", error: null };
    }
    if (channel === "sms" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const payload = new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: body });
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        { method: "POST", headers: { Authorization: `Basic ${auth}` }, body: payload },
      );
      if (!response.ok) return { status: "failed", error: `SMS provider returned ${response.status}` };
      return { status: "sent", error: null };
    }
    console.log(JSON.stringify({ notification: channel, to, subject, body }));
    return { status: "logged", error: null };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Notification failed" };
  }
}

export function moneyLabel(cents: number) {
  return formatAud(cents);
}

export function trackUrl(token: string) {
  return absoluteUrl(`/track/${token}`);
}

export { brand };
