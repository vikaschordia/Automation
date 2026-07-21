import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { bulkUpdateSchema, bulkDeleteSchema } from "@/lib/validations/task";
import { bulkSoftDeleteTasks } from "@/lib/services/task-service";

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

    // Mirrors the single-task update path in task-service.ts: completing a task always stamps
    // progress to 100%, and falls back to "now" if the caller didn't supply a real completion
    // date (the UI always does via CompleteTaskDialog — this is just a safety net for direct
    // API callers).
    const data: typeof patch & { progressPercent?: number } = { ...patch };
    if (data.status === "COMPLETED") {
      data.progressPercent = 100;
      data.completedDate = data.completedDate ?? new Date();
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.updateMany({ where: { id: { in: taskIds }, deletedAt: null }, data });
      await tx.taskHistory.createMany({
        data: taskIds.map((taskId) => ({
          taskId,
          changedById: session.sub,
          action: "UPDATED" as const,
          field: "bulk",
          newValue: JSON.stringify(data),
        })),
      });
    });

    return NextResponse.json({ ok: true, updated: taskIds.length });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession(["ADMIN"]);
    const body = await request.json().catch(() => null);
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const deleted = await bulkSoftDeleteTasks(parsed.data.taskIds, session);
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
