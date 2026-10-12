import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie } from "@/lib/auth";
import { deleteSession } from "@/lib/db/repo";
import { brand } from "@/lib/brand";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(adminCookie.name)?.value;
  if (token) await deleteSession("admin", token);
  const response = NextResponse.redirect(new URL("/admin/login", brand.url));
  response.cookies.delete(adminCookie.name);
  return response;
}
