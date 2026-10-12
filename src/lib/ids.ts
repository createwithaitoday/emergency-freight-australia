import { createHash, randomBytes, randomUUID } from "node:crypto";

export function newId() {
  return randomUUID();
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function quoteNumber(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `EFA-${y}${m}${d}-${suffix}`;
}

export function invoiceNumber(now = new Date()) {
  const y = now.getUTCFullYear();
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `INV-${y}-${suffix}`;
}
