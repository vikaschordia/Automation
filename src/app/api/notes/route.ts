import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { noteCreateSchema } from "@/lib/validations/note";

export async function GET() {
  try {
    const session = await requireSession();
    const notes = await prisma.note.findMany({
      where: { userId: session.sub },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ notes });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = noteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const last = await prisma.note.findFirst({ where: { userId: session.sub }, orderBy: { order: "desc" } });
    const note = await prisma.note.create({
      data: { userId: session.sub, content: parsed.data.content, order: (last?.order ?? -1) + 1 },
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
