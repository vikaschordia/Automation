import { NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { getNotifications } from "@/lib/services/notification-service";

export async function GET() {
  try {
    const session = await requireSession();
    const result = await getNotifications(session);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
