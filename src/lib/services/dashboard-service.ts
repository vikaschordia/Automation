import { prisma } from "@/lib/prisma";
import { calculateDelayDays, isOverdue, isDueToday, isDueTomorrow } from "@/lib/delay";
import { formatTaskNumber } from "@/lib/task-number";
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/constants";

const TREND_MONTHS = 6;

function monthBuckets(count: number): { key: string; label: string; start: Date; end: Date }[] {
  const now = new Date();
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      start,
      end,
    });
  }
  return buckets;
}

const OPEN_STATUSES = ["PENDING", "IN_PROGRESS", "WAITING_APPROVAL", "DELAYED", "ON_HOLD"];

export async function getAdminDashboardData() {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      status: true,
      priority: true,
      dueDate: true,
      completedDate: true,
      assignedDate: true,
      assignedToId: true,
      title: true,
      assignedTo: { select: { id: true, name: true, status: true } },
      department: { select: { name: true } },
      company: { select: { name: true } },
    },
  });

  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === "PENDING").length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const delayedStatus = tasks.filter((t) => t.status === "DELAYED").length;
  const overdue = tasks.filter((t) => OPEN_STATUSES.includes(t.status) && isOverdue(t.dueDate, t.completedDate)).length;
  const dueToday = tasks.filter((t) => OPEN_STATUSES.includes(t.status) && isDueToday(t.dueDate)).length;
  const highPriority = tasks.filter((t) => t.priority === "P1_URGENT" && OPEN_STATUSES.includes(t.status)).length;

  const completedTasks = tasks.filter((t) => t.status === "COMPLETED" && t.completedDate);
  const avgCompletionDays =
    completedTasks.length === 0
      ? 0
      : Math.round(
          Math.max(
            0,
            completedTasks.reduce((sum, t) => sum + (t.completedDate!.getTime() - t.assignedDate.getTime()) / 86400000, 0) /
              completedTasks.length,
          ) * 10,
        ) / 10;
  const completionPercent = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;

  const byDepartment = groupCount(tasks, (t) => t.department.name);
  const byCompany = groupCount(tasks, (t) => t.company.name);
  const byPriority = TASK_PRIORITIES.map((p: TaskPriority) => ({
    priority: p,
    count: tasks.filter((t) => t.priority === p).length,
  }));

  const employeeMap = new Map<string, { name: string; total: number; completed: number }>();
  for (const t of tasks) {
    if (t.assignedTo.status !== "ACTIVE") continue;
    const entry = employeeMap.get(t.assignedToId) ?? { name: t.assignedTo.name, total: 0, completed: 0 };
    entry.total += 1;
    if (t.status === "COMPLETED") entry.completed += 1;
    employeeMap.set(t.assignedToId, entry);
  }
  const employeePerformance = Array.from(employeeMap.values()).map((e) => ({
    name: e.name,
    completionRate: e.total === 0 ? 0 : Math.round((e.completed / e.total) * 100),
  }));

  const buckets = monthBuckets(TREND_MONTHS);
  const monthlyCompletionTrend = buckets.map((b) => ({
    period: b.label,
    value: tasks.filter((t) => t.completedDate && t.completedDate >= b.start && t.completedDate < b.end).length,
  }));
  const delayTrend = buckets.map((b) => {
    const due = tasks.filter((t) => t.dueDate >= b.start && t.dueDate < b.end);
    const avg = due.length === 0 ? 0 : due.reduce((sum, t) => sum + calculateDelayDays(t.dueDate, t.completedDate), 0) / due.length;
    return { period: b.label, value: Math.round(avg * 10) / 10 };
  });

  const alertTask = (t: (typeof tasks)[number]) => ({
    id: t.id,
    taskNumber: formatTaskNumber(t.id),
    title: t.title,
    priority: t.priority,
    dueDate: t.dueDate,
    assignedToName: t.assignedTo.name,
  });

  const openTasks = tasks.filter((t) => OPEN_STATUSES.includes(t.status));
  const alerts = {
    dueToday: openTasks.filter((t) => isDueToday(t.dueDate)).slice(0, 6).map(alertTask),
    overdue: openTasks
      .filter((t) => isOverdue(t.dueDate, null))
      .sort((a, b) => calculateDelayDays(b.dueDate, null) - calculateDelayDays(a.dueDate, null))
      .slice(0, 6)
      .map(alertTask),
    dueTomorrow: openTasks.filter((t) => isDueTomorrow(t.dueDate)).slice(0, 6).map(alertTask),
    highPriority: openTasks.filter((t) => t.priority === "P1_URGENT").slice(0, 6).map(alertTask),
  };

  return {
    stats: { total, pending, completed, delayed: delayedStatus, overdue, dueToday, highPriority, avgCompletionDays, completionPercent },
    charts: { byDepartment, byCompany, byPriority, employeePerformance, monthlyCompletionTrend, delayTrend },
    alerts,
  };
}

function groupCount<T>(items: T[], keyFn: (item: T) => string): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
}

export async function getEmployeeDashboardData(employeeId: string) {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null, assignedToId: employeeId },
    orderBy: { dueDate: "asc" },
  });

  const openTasks = tasks.filter((t) => OPEN_STATUSES.includes(t.status));
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;

  const toRow = (t: (typeof tasks)[number]) => ({
    id: t.id,
    taskNumber: formatTaskNumber(t.id),
    title: t.title,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    progressPercent: t.progressPercent,
  });

  const history = await prisma.taskHistory.findMany({
    where: { task: { assignedToId: employeeId, deletedAt: null } },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { task: { select: { id: true, title: true } }, changedBy: { select: { email: true } } },
  });

  return {
    stats: {
      total,
      completed,
      pending: tasks.filter((t) => t.status === "PENDING").length,
      completionPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
      overdue: openTasks.filter((t) => isOverdue(t.dueDate, null)).length,
      urgent: openTasks.filter((t) => t.priority === "P1_URGENT").length,
    },
    todaysTasks: openTasks.filter((t) => isDueToday(t.dueDate)).map(toRow),
    pendingTasks: tasks.filter((t) => t.status === "PENDING").slice(0, 8).map(toRow),
    urgentTasks: openTasks.filter((t) => t.priority === "P1_URGENT").slice(0, 8).map(toRow),
    upcomingTasks: openTasks
      .filter((t) => !isOverdue(t.dueDate, null) && !isDueToday(t.dueDate))
      .slice(0, 8)
      .map(toRow),
    recentActivity: history.map((h) => ({
      id: h.id,
      action: h.action,
      field: h.field,
      createdAt: h.createdAt,
      taskId: h.task.id,
      taskTitle: h.task.title,
      changedByEmail: h.changedBy.email,
    })),
  };
}
