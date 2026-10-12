import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customerCookie } from "@/lib/auth";
import { deleteSession } from "@/lib/db/repo";
import { brand } from "@/lib/brand";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(customerCookie.name)?.value;
  if (token) await deleteSession("customer", token);
  const response = NextResponse.redirect(new URL("/account", brand.url));
  response.cookies.delete(customerCookie.name);
  return response;
}
