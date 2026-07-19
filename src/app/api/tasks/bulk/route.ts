import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { bulkUpdateSchema } from "@/lib/validations/task";

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession(["ADMIN"]);
    const body = await request.json().catch(() => null);
    const parsed = bulkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { taskIds, patch } = parsed.data;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.updateMany({ where: { id: { in: taskIds }, deletedAt: null }, data: patch });
      await tx.taskHistory.createMany({
        data: taskIds.map((taskId) => ({
          taskId,
          changedById: session.sub,
          action: "UPDATED" as const,
          field: "bulk",
          newValue: JSON.stringify(patch),
        })),
      });
    });

    return NextResponse.json({ ok: true, updated: taskIds.length });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
