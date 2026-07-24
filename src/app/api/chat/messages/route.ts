import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { chatMessageCreateSchema } from "@/lib/validations/chat";
import { listMessages, createMessage } from "@/lib/services/chat-service";

export async function GET() {
  try {
    const session = await requireSession();
    const messages = await listMessages(session.sub);
    return NextResponse.json({ messages });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = chatMessageCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const message = await createMessage(session, parsed.data.body, parsed.data.mentionedUserIds ?? []);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
