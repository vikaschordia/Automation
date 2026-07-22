import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { noteUpdateSchema } from "@/lib/validations/note";

async function assertOwnsNote(id: string, userId: string) {
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.userId !== userId) throw new ApiError(404, "Note not found");
  return note;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await assertOwnsNote(id, session.sub);
    const body = await request.json().catch(() => null);
    const parsed = noteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const note = await prisma.note.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ note });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await assertOwnsNote(id, session.sub);
    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
