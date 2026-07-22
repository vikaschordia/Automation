import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateDelayDays, isOverdue, isDueToday, startOfDay, parseLocalDateString } from "@/lib/delay";
import { formatTaskNumber } from "@/lib/task-number";
import { ApiError } from "@/lib/session";
import { TASK_SORT_FIELDS, OPEN_TASK_STATUSES, type TaskSortField } from "@/lib/constants";
import type { TaskCreateInput, TaskUpdateInput } from "@/lib/validations/task";
import type { SessionPayload } from "@/lib/auth";

/**
 * Turns a spreadsheet column id (see TASK_SORT_FIELDS) into a Prisma `orderBy`. Some columns —
 * Task ID, Employee, Company, Department — aren't plain scalar columns on Task, so `{ [sortBy]:
 * sortDir }` silently fails/no-ops for them; this is what actually knows how to sort by each one.
 */
export function buildTaskOrderBy(sortByRaw: string, sortDir: "asc" | "desc"): Prisma.TaskOrderByWithRelationInput {
  const sortBy: TaskSortField = (TASK_SORT_FIELDS as readonly string[]).includes(sortByRaw)
    ? (sortByRaw as TaskSortField)
    : "dueDate";

  switch (sortBy) {
    case "taskNumber":
      return { taskNumber: sortDir };
    case "employee":
      return { assignedTo: { name: sortDir } };
    case "company":
      return { company: { name: sortDir } };
    case "department":
      return { department: { name: sortDir } };
    default:
      return { [sortBy]: sortDir };
  }
}

function dayAfter(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

/**
 * A few dashboard stat cards (Overdue, Today's Due, High Priority) aren't a plain field-equality
 * filter — they combine a date window with "still open" (excludes COMPLETED/CANCELLED), same as
 * getAdminDashboardData's stats. This is what the "click a stat card, land on the exact matching
 * task list" flow uses so the count on the card and the count on /tasks never disagree.
 */
function buildBucketWhere(bucket: string | null): Prisma.TaskWhereInput {
  if (!bucket) return {};

  const todayStart = startOfDay(new Date());
  const tomorrowStart = dayAfter(todayStart);
  const dayAfterTomorrowStart = dayAfter(tomorrowStart);

  switch (bucket) {
    case "overdue":
      return { status: { in: OPEN_TASK_STATUSES }, completedDate: null, dueDate: { lt: todayStart } };
    case "dueToday":
      return { status: { in: OPEN_TASK_STATUSES }, dueDate: { gte: todayStart, lt: tomorrowStart } };
    case "dueTomorrow":
      return { status: { in: OPEN_TASK_STATUSES }, dueDate: { gte: tomorrowStart, lt: dayAfterTomorrowStart } };
    case "highPriorityOpen":
      return { priority: "P1_URGENT", status: { in: OPEN_TASK_STATUSES } };
    default:
      return {};
  }
}

/**
 * Shared by GET /api/tasks (paginated list) and GET /api/tasks/export (unpaginated Excel
 * download) so the two never drift out of sync on what "matches the current filters" means.
 */
export function buildTaskWhere(params: URLSearchParams, session: SessionPayload): Prisma.TaskWhereInput {
  const search = params.get("search")?.trim();
  const taskNumberMatch = search ? /^(TSK-)?0*(\d+)$/i.exec(search) : null;

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
            // dueFrom/dueTo are "yyyy-mm-dd" (date-only, no time-of-day). dueTo needs the whole
            // day included — e.g. dueFrom=dueTo=today must match a task due today at 2pm — so the
            // upper bound is exclusive against the *next* day's local midnight, not <= today's.
            ...(params.get("dueFrom") ? { gte: parseLocalDateString(params.get("dueFrom")!) } : {}),
            ...(params.get("dueTo") ? { lt: dayAfter(parseLocalDateString(params.get("dueTo")!)) } : {}),
          },
        }
      : {}),
    ...buildBucketWhere(params.get("bucket")),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            ...(taskNumberMatch ? [{ taskNumber: Number(taskNumberMatch[2]) }] : []),
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
    taskNumber: formatTaskNumber(task.taskNumber),
    tags: safeParseTags(task.tags),
    delayDays: calculateDelayDays(task.dueDate, task.completedDate),
    isOverdue: isOverdue(task.dueDate, task.completedDate),
    isDueToday: isDueToday(task.dueDate),
  };
}

/**
 * Hands out the next sequential Task Number by atomically incrementing a single Counter document
 * (upserted on first use). MongoDB has no autoincrement column, so this is what replaces it.
 */
async function nextTaskNumber(tx: Prisma.TransactionClient): Promise<number> {
  const counter = await tx.counter.upsert({
    where: { id: "task" },
    create: { id: "task", value: 1 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}

function safeParseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

/**
 * "Partially Completed" is never written to any Task row's status — it's this computed,
 * display-only label for a group of linked tasks (see groupId on the Task model). Individual
 * rows always keep showing their own real status everywhere else (spreadsheet, dashboards,
 * reports); this is only used for the task detail page's "Linked Assignments" summary.
 */
export function getGroupSummary(tasks: { status: string }[]): {
  total: number;
  completedCount: number;
  label: "Completed" | "Partially Completed" | "Pending";
} {
  const total = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const label = completedCount === 0 ? "Pending" : completedCount === total ? "Completed" : "Partially Completed";
  return { total, completedCount, label };
}

interface SharedTaskFields {
  title: string;
  description: string | null;
  priority: string;
  dueDate: Date;
  assignedDate: Date;
  departmentId: string;
  companyId: string;
  categoryId: string | null;
  estimatedHours: number | null;
  remarks: string | null;
  tags: string;
}

/**
 * Assigning a task to multiple employees creates one independent Task row per employee — same
 * shared fields, each with their own id/status/progress starting fresh at PENDING/0 — correlated
 * only by `groupId`. This is what every "also assign to" flow (create and update) calls once it
 * has the shared fields and the list of employees who don't already have a copy in the group.
 */
async function createLinkedSiblings(
  tx: Prisma.TransactionClient,
  shared: SharedTaskFields,
  employeeIds: string[],
  groupId: string,
  session: SessionPayload,
) {
  const created: TaskWithRelations[] = [];
  for (const employeeId of employeeIds) {
    const taskNumber = await nextTaskNumber(tx);
    const task = await tx.task.create({
      data: {
        taskNumber,
        title: shared.title,
        description: shared.description,
        assignedToId: employeeId,
        assignedById: session.sub,
        departmentId: shared.departmentId,
        companyId: shared.companyId,
        categoryId: shared.categoryId,
        priority: shared.priority,
        status: "PENDING",
        assignedDate: shared.assignedDate,
        dueDate: shared.dueDate,
        completedDate: null,
        progressPercent: 0,
        estimatedHours: shared.estimatedHours,
        remarks: shared.remarks,
        tags: shared.tags,
        groupId,
        deletedAt: null,
      },
      include: taskInclude,
    });
    await tx.taskHistory.create({
      data: { taskId: task.id, changedById: session.sub, action: "CREATED", newValue: task.status },
    });
    created.push(task);
  }
  return created;
}

export async function createTask(input: TaskCreateInput, session: SessionPayload) {
  const additionalIds = Array.from(
    new Set((input.additionalAssignedToIds ?? []).filter((id) => id && id !== input.assignedToId)),
  );
  const groupId = additionalIds.length > 0 ? randomUUID() : null;

  const { task, linkedTasks } = await prisma.$transaction(async (tx) => {
    const taskNumber = await nextTaskNumber(tx);
    const created = await tx.task.create({
      data: {
        taskNumber,
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
        completedDate: input.completedDate ?? null,
        progressPercent: input.progressPercent ?? 0,
        estimatedHours: input.estimatedHours ?? null,
        remarks: input.remarks || null,
        tags: JSON.stringify(input.tags ?? []),
        groupId,
        deletedAt: null,
      },
      include: taskInclude,
    });
    await tx.taskHistory.create({
      data: { taskId: created.id, changedById: session.sub, action: "CREATED", newValue: created.status },
    });

    const linked =
      additionalIds.length > 0
        ? await createLinkedSiblings(tx, created, additionalIds, groupId!, session)
        : [];

    return { task: created, linkedTasks: linked };
  });

  return { task: serializeTask(task), linkedTasks: linkedTasks.map(serializeTask) };
}

/**
 * Applies a patch to a task, enforcing that employees never bypass field-level RBAC (callers
 * must run assertTaskFieldsEditable/assertOwnsTask first) and writing one TaskHistory row per
 * changed field so the activity timeline stays accurate.
 */
export async function updateTask(taskId: string, patch: TaskUpdateInput, session: SessionPayload) {
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

  // Adding assignees to this task's group (may be its first — group is created on demand).
  const additionalIds = Array.from(
    new Set((patch.additionalAssignedToIds ?? []).filter((id) => id && id !== existing.assignedToId)),
  );
  const isFirstLink = additionalIds.length > 0 && !existing.groupId;
  const groupId = existing.groupId ?? (isFirstLink ? randomUUID() : null);
  if (isFirstLink) data.groupId = groupId;

  if (Object.keys(data).length === 0 && additionalIds.length === 0) {
    const unchanged = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
    return { task: serializeTask(unchanged), linkedTasks: [] };
  }

  const { task: updated, linkedTasks } = await prisma.$transaction(async (tx) => {
    const result =
      Object.keys(data).length > 0
        ? await tx.task.update({ where: { id: taskId }, data, include: taskInclude })
        : await tx.task.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
    if (historyEntries.length > 0) {
      await tx.taskHistory.createMany({ data: historyEntries });
    }

    let linked: TaskWithRelations[] = [];
    if (additionalIds.length > 0 && groupId) {
      // Exclude anyone already linked in this group (re-adding an existing sibling would
      // otherwise create a duplicate copy for them).
      const alreadyLinked = await tx.task.findMany({
        where: { groupId, deletedAt: null },
        select: { assignedToId: true },
      });
      const alreadyLinkedIds = new Set(alreadyLinked.map((t) => t.assignedToId));
      const toCreate = additionalIds.filter((id) => !alreadyLinkedIds.has(id));
      if (toCreate.length > 0) {
        linked = await createLinkedSiblings(tx, result, toCreate, groupId, session);
        await tx.taskHistory.create({
          data: {
            taskId,
            changedById: session.sub,
            action: "UPDATED",
            field: "additionalAssignedToIds",
            newValue: `+${toCreate.length} employee(s)`,
          },
        });
      }
    }

    return { task: result, linkedTasks: linked };
  });

  return { task: serializeTask(updated), linkedTasks: linkedTasks.map(serializeTask) };
}

export async function softDeleteTask(taskId: string, session: SessionPayload) {
  const existing = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Task not found");
  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } }),
    prisma.taskHistory.create({ data: { taskId, changedById: session.sub, action: "UPDATED", field: "deletedAt", newValue: "deleted" } }),
  ]);
}

/** Bulk counterpart of softDeleteTask, used by the spreadsheet's multi-select "Delete" action. */
export async function bulkSoftDeleteTasks(taskIds: string[], session: SessionPayload): Promise<number> {
  const existing = await prisma.task.findMany({ where: { id: { in: taskIds }, deletedAt: null }, select: { id: true } });
  const existingIds = existing.map((t) => t.id);
  if (existingIds.length === 0) return 0;

  await prisma.$transaction([
    prisma.task.updateMany({ where: { id: { in: existingIds } }, data: { deletedAt: new Date() } }),
    prisma.taskHistory.createMany({
      data: existingIds.map((taskId) => ({
        taskId,
        changedById: session.sub,
        action: "UPDATED" as const,
        field: "deletedAt",
        newValue: "deleted",
      })),
    }),
  ]);
  return existingIds.length;
}
