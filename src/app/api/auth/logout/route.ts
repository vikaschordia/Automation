import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/constants";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  return response;
}
