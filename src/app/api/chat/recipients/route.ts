import { NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { listRecipients } from "@/lib/services/chat-service";

export async function GET() {
  try {
    await requireSession();
    const recipients = await listRecipients();
    return NextResponse.json({ recipients });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
