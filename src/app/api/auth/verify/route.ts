import { NextResponse } from "next/server";
import { customerCookie } from "@/lib/auth";
import { consumeMagicLink } from "@/lib/db/repo";
import { brand } from "@/lib/brand";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await consumeMagicLink(token);
  if (!result) {
    return NextResponse.redirect(new URL("/account?error=link", brand.url));
  }
  const response = NextResponse.redirect(new URL("/account", brand.url));
  response.cookies.set(customerCookie.name, result.session, customerCookie.options);
  return response;
}
