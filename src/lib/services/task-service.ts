import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateDelayDays, isOverdue, isDueToday } from "@/lib/delay";
import { formatTaskNumber } from "@/lib/task-number";
import { ApiError } from "@/lib/session";
import type { TaskCreateInput, TaskUpdateInput } from "@/lib/validations/task";
import type { SessionPayload } from "@/lib/auth";

/**
 * Shared by GET /api/tasks (paginated list) and GET /api/tasks/export (unpaginated Excel
 * download) so the two never drift out of sync on what "matches the current filters" means.
 */
export function buildTaskWhere(params: URLSearchParams, session: SessionPayload): Prisma.TaskWhereInput {
  const search = params.get("search")?.trim();
  const taskIdMatch = search ? /^(TSK-)?0*(\d+)$/i.exec(search) : null;

  return {
    deletedAt: null,
    ...(session.role === "EMPLOYEE" ? { assignedToId: session.employeeId ?? "__none__" } : {}),
    ...(params.get("assignedToId") && session.role === "ADMIN" ? { assignedToId: params.get("assignedToId")! } : {}),
    ...(params.get("companyId") ? { companyId: params.get("companyId")! } : {}),
    ...(params.get("departmentId") ? { departmentId: params.get("departmentId")! } : {}),
    ...(params.get("categoryId") ? { categoryId: params.get("categoryId")! } : {}),
    ...(params.get("priority") ? { priority: params.get("priority")! } : {}),
    ...(params.get("status") ? { status: params.get("status")! } : {}),
    ...(params.get("dueFrom") || params.get("dueTo")
      ? {
          dueDate: {
            ...(params.get("dueFrom") ? { gte: new Date(params.get("dueFrom")!) } : {}),
            ...(params.get("dueTo") ? { lte: new Date(params.get("dueTo")!) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            ...(taskIdMatch ? [{ id: Number(taskIdMatch[2]) }] : []),
          ],
        }
      : {}),
  };
}

export const taskInclude = {
  assignedTo: { select: { id: true, name: true, employeeCode: true, designation: true } },
  assignedBy: { select: { id: true, email: true } },
  department: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export function serializeTask(task: TaskWithRelations) {
  return {
    ...task,
    taskNumber: formatTaskNumber(task.id),
    tags: safeParseTags(task.tags),
    delayDays: calculateDelayDays(task.dueDate, task.completedDate),
    isOverdue: isOverdue(task.dueDate, task.completedDate),
    isDueToday: isDueToday(task.dueDate),
  };
}

function safeParseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export async function createTask(input: TaskCreateInput, session: SessionPayload) {
  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title: input.title,
        description: input.description || null,
        assignedToId: input.assignedToId,
        assignedById: session.sub,
        departmentId: input.departmentId,
        companyId: input.companyId,
        categoryId: input.categoryId || null,
        priority: input.priority,
        status: input.status ?? "PENDING",
        assignedDate: input.assignedDate,
        dueDate: input.dueDate,
        progressPercent: input.progressPercent ?? 0,
        estimatedHours: input.estimatedHours ?? null,
        remarks: input.remarks || null,
        tags: JSON.stringify(input.tags ?? []),
      },
      include: taskInclude,
    });
    await tx.taskHistory.create({
      data: { taskId: created.id, changedById: session.sub, action: "CREATED", newValue: created.status },
    });
    return created;
  });
  return serializeTask(task);
}

/**
 * Applies a patch to a task, enforcing that employees never bypass field-level RBAC (callers
 * must run assertTaskFieldsEditable/assertOwnsTask first) and writing one TaskHistory row per
 * changed field so the activity timeline stays accurate.
 */
export async function updateTask(taskId: number, patch: TaskUpdateInput, session: SessionPayload) {
  const existing = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Task not found");

  const data: Prisma.TaskUpdateInput = {};
  const historyEntries: Prisma.TaskHistoryCreateManyInput[] = [];

  const trackScalar = <K extends keyof TaskUpdateInput>(
    field: K,
    dbField: keyof typeof existing,
    format: (v: NonNullable<TaskUpdateInput[K]>) => string = (v) => String(v),
  ) => {
    if (patch[field] === undefined) return;
    const newVal = patch[field];
    const oldVal = existing[dbField];
    const changed = newVal instanceof Date ? newVal.getTime() !== (oldVal as Date | null)?.getTime() : newVal !== oldVal;
    if (!changed) return;
    (data as Record<string, unknown>)[dbField as string] = newVal;
    historyEntries.push({
      taskId,
      changedById: session.sub,
      action: field === "status" ? "STATUS_CHANGED" : "UPDATED",
      field: String(field),
      oldValue: oldVal == null ? null : format(oldVal as NonNullable<TaskUpdateInput[K]>),
      newValue: newVal == null ? null : format(newVal),
    });
  };

  trackScalar("title", "title");
  trackScalar("description", "description");
  trackScalar("assignedToId", "assignedToId");
  trackScalar("departmentId", "departmentId");
  trackScalar("companyId", "companyId");
  trackScalar("categoryId", "categoryId");
  trackScalar("priority", "priority");
  trackScalar("assignedDate", "assignedDate", (v) => new Date(v).toISOString());
  trackScalar("dueDate", "dueDate", (v) => new Date(v).toISOString());
  trackScalar("estimatedHours", "estimatedHours");
  trackScalar("actualHours", "actualHours");
  trackScalar("remarks", "remarks");
  trackScalar("progressPercent", "progressPercent");

  if (patch.tags !== undefined) {
    const newTags = JSON.stringify(patch.tags);
    if (newTags !== existing.tags) {
      data.tags = newTags;
      historyEntries.push({ taskId, changedById: session.sub, action: "UPDATED", field: "tags" });
    }
  }

  // Status changes get special handling: auto-stamp/clear completedDate and log
  // COMPLETED/REOPENED instead of a generic STATUS_CHANGED where relevant.
  if (patch.status !== undefined && patch.status !== existing.status) {
    data.status = patch.status;
    const isNowCompleted = patch.status === "COMPLETED";
    const wasCompleted = existing.status === "COMPLETED";

    if (isNowCompleted && !wasCompleted) {
      data.completedDate = patch.completedDate ?? new Date();
      data.progressPercent = 100;
      historyEntries.push({ taskId, changedById: session.sub, action: "COMPLETED", field: "status", oldValue: existing.status, newValue: patch.status });
    } else if (!isNowCompleted && wasCompleted) {
      data.completedDate = null;
      historyEntries.push({ taskId, changedById: session.sub, action: "REOPENED", field: "status", oldValue: existing.status, newValue: patch.status });
    } else {
      historyEntries.push({ taskId, changedById: session.sub, action: "STATUS_CHANGED", field: "status", oldValue: existing.status, newValue: patch.status });
    }
  } else if (patch.completedDate !== undefined) {
    const changed = patch.completedDate?.getTime() !== existing.completedDate?.getTime();
    if (changed) {
      data.completedDate = patch.completedDate;
      historyEntries.push({ taskId, changedById: session.sub, action: "UPDATED", field: "completedDate" });
    }
  }

  if (Object.keys(data).length === 0) {
    const unchanged = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
    return serializeTask(unchanged);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.task.update({ where: { id: taskId }, data, include: taskInclude });
    if (historyEntries.length > 0) {
      await tx.taskHistory.createMany({ data: historyEntries });
    }
    return result;
  });

  return serializeTask(updated);
}

export async function softDeleteTask(taskId: number, session: SessionPayload) {
  const existing = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Task not found");
  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } }),
    prisma.taskHistory.create({ data: { taskId, changedById: session.sub, action: "UPDATED", field: "deletedAt", newValue: "deleted" } }),
  ]);
}
