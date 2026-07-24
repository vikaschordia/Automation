import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { assertOwnsTask, assertTaskFieldsEditable } from "@/lib/rbac";
import { taskUpdateSchema } from "@/lib/validations/task";
import { serializeTask, taskInclude, updateTask, softDeleteTask, getGroupSummary } from "@/lib/services/task-service";
import { logAudit } from "@/lib/services/audit-service";
import { formatTaskNumber } from "@/lib/task-number";

type Params = Promise<{ id: string }>;

async function loadTaskOr404(id: string) {
  const task = await prisma.task.findFirst({ where: { id, deletedAt: null }, include: taskInclude });
  if (!task) throw new ApiError(404, "Task not found");
  return task;
}

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession();
    const { id: taskId } = await params;

    const task = await loadTaskOr404(taskId);
    assertOwnsTask(session.role, session.employeeId, task.assignedToId);

    const history = await prisma.taskHistory.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      include: { changedBy: { select: { id: true, email: true, role: true } } },
    });

    const siblings = task.groupId
      ? await prisma.task.findMany({
          where: { groupId: task.groupId, deletedAt: null, id: { not: taskId } },
          include: taskInclude,
          orderBy: { assignedTo: { name: "asc" } },
        })
      : [];
    const linkedTasks = siblings.map(serializeTask);
    const groupSummary = task.groupId ? getGroupSummary([task, ...siblings]) : null;

    return NextResponse.json({ task: serializeTask(task), history, linkedTasks, groupSummary });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession();
    const { id: taskId } = await params;

    const body = await request.json().catch(() => null);
    const parsed = taskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const existing = await loadTaskOr404(taskId);
    assertOwnsTask(session.role, session.employeeId, existing.assignedToId);
    assertTaskFieldsEditable(session.role, Object.keys(parsed.data));

    const { task, linkedTasks } = await updateTask(taskId, parsed.data, session);
    await logAudit({
      session,
      action: "UPDATE",
      entityType: "TASK",
      entityId: taskId,
      summary: `Updated task ${task.taskNumber}: "${task.title}" (${Object.keys(parsed.data).join(", ")})`,
    });
    return NextResponse.json({ task, linkedTasks });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession(["ADMIN"]);
    const { id: taskId } = await params;
    const existing = await loadTaskOr404(taskId);
    await softDeleteTask(taskId, session);
    await logAudit({
      session,
      action: "DELETE",
      entityType: "TASK",
      entityId: taskId,
      summary: `Deleted task ${formatTaskNumber(existing.taskNumber)}: "${existing.title}"`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
