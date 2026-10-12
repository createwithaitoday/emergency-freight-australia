import { cookies } from "next/headers";
import { sessionSubject } from "@/lib/db/repo";

export const adminCookie = {
  name: "efa_admin",
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  },
};

export const customerCookie = {
  name: "efa_customer",
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function currentAdmin() {
  const jar = await cookies();
  const token = jar.get(adminCookie.name)?.value;
  if (!token) return null;
  const row = await sessionSubject("admin", token);
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: String(row.role),
  };
}

export async function currentCustomer() {
  const jar = await cookies();
  const token = jar.get(customerCookie.name)?.value;
  if (!token) return null;
  const row = await sessionSubject("customer", token);
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
  };
}

export function roleAllows(role: string, action: string) {
  if (role === "admin") return true;
  const map: Record<string, string[]> = {
    dispatcher: ["bookings", "price", "assign", "notes", "pod", "status"],
    finance: ["bookings", "finance", "refund", "notes"],
    viewer: ["bookings"],
  };
  return (map[role] ?? []).includes(action);
}
