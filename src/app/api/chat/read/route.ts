import { NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { markRead } from "@/lib/services/chat-service";

export async function POST() {
  try {
    const session = await requireSession();
    await markRead(session.sub);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
