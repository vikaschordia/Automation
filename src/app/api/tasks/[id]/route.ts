import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { assertOwnsTask, assertTaskFieldsEditable } from "@/lib/rbac";
import { taskUpdateSchema } from "@/lib/validations/task";
import { serializeTask, taskInclude, updateTask, softDeleteTask } from "@/lib/services/task-service";

type Params = Promise<{ id: string }>;

async function loadTaskOr404(id: number) {
  const task = await prisma.task.findFirst({ where: { id, deletedAt: null }, include: taskInclude });
  if (!task) throw new ApiError(404, "Task not found");
  return task;
}

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const taskId = Number(id);
    if (!Number.isInteger(taskId)) throw new ApiError(400, "Invalid task id");

    const task = await loadTaskOr404(taskId);
    assertOwnsTask(session.role, session.employeeId, task.assignedToId);

    const history = await prisma.taskHistory.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      include: { changedBy: { select: { id: true, email: true, role: true } } },
    });

    return NextResponse.json({ task: serializeTask(task), history });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const taskId = Number(id);
    if (!Number.isInteger(taskId)) throw new ApiError(400, "Invalid task id");

    const body = await request.json().catch(() => null);
    const parsed = taskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const existing = await loadTaskOr404(taskId);
    assertOwnsTask(session.role, session.employeeId, existing.assignedToId);
    assertTaskFieldsEditable(session.role, Object.keys(parsed.data));

    const task = await updateTask(taskId, parsed.data, session);
    return NextResponse.json({ task });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession(["ADMIN"]);
    const { id } = await params;
    const taskId = Number(id);
    if (!Number.isInteger(taskId)) throw new ApiError(400, "Invalid task id");
    await softDeleteTask(taskId, session);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
