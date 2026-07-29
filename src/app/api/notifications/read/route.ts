import { NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { markNotificationsRead } from "@/lib/services/notification-service";

export async function POST() {
  try {
    const session = await requireSession();
    await markNotificationsRead(session);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
