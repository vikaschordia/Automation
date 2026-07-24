import { NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { getUnreadMentionInfo } from "@/lib/services/chat-service";

export async function GET() {
  try {
    const session = await requireSession();
    const info = await getUnreadMentionInfo(session.sub);
    return NextResponse.json(info);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
