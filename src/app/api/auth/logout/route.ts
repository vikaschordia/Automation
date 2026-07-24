import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/services/audit-service";
import { ACCESS_TOKEN_COOKIE } from "@/lib/constants";

export async function POST() {
  const session = await getSession();
  if (session) {
    await logAudit({ session, action: "LOGOUT", entityType: "AUTH", entityId: session.sub, summary: `${session.name} logged out` });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  return response;
}
