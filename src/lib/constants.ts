// Single source of truth for every enum-like value in the app (Prisma/SQLite stores these
// as plain strings — see prisma/schema.prisma). Every place that needs the list of valid
// values, a display label, or a color should import from here rather than hard-coding.

export const ROLES = ["ADMIN", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const TASK_PRIORITIES = ["P1_URGENT", "P2_MEDIUM", "P3_LOW"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "WAITING_APPROVAL",
  "COMPLETED",
  "DELAYED",
  "CANCELLED",
  "ON_HOLD",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * Statuses that count as "still open" for dashboard stats (excludes COMPLETED/CANCELLED).
 * Typed as plain string[] (not TaskStatus[]) because it's matched against Task.status, which
 * Prisma/SQLite surfaces as a raw string, and against Prisma's `{ in: [...] }` filter shape.
 */
export const OPEN_TASK_STATUSES: string[] = ["PENDING", "IN_PROGRESS", "WAITING_APPROVAL", "DELAYED", "ON_HOLD"];

export const TASK_HISTORY_ACTIONS = [
  "CREATED",
  "UPDATED",
  "STATUS_CHANGED",
  "COMPLETED",
  "REOPENED",
] as const;
export type TaskHistoryAction = (typeof TASK_HISTORY_ACTIONS)[number];

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badgeClass: string; dot: string; excelArgb: string; sortOrder: number }
> = {
  P1_URGENT: {
    label: "Very Urgent",
    badgeClass: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    dot: "bg-red-500",
    excelArgb: "FFFECACA", // light red fill
    sortOrder: 0,
  },
  P2_MEDIUM: {
    label: "Medium",
    badgeClass:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
    dot: "bg-orange-500",
    excelArgb: "FFFED7AA",
    sortOrder: 1,
  },
  P3_LOW: {
    label: "Low",
    badgeClass:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
    dot: "bg-green-500",
    excelArgb: "FFBBF7D0",
    sortOrder: 2,
  },
};

export const STATUS_META: Record<TaskStatus, { label: string; badgeClass: string }> = {
  PENDING: {
    label: "Pending",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  IN_PROGRESS: {
    label: "In Progress",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  },
  WAITING_APPROVAL: {
    label: "Waiting for Approval",
    badgeClass:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900",
  },
  COMPLETED: {
    label: "Completed",
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  },
  DELAYED: {
    label: "Delayed",
    badgeClass: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700",
  },
  ON_HOLD: {
    label: "On Hold",
    badgeClass:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  },
};

/**
 * Employees can fully edit their own tasks now — the only fields still admin-only are the ones
 * that move a task to/from someone else (reassigning it away from yourself, or fanning it out to
 * additional employees). Everything else (title, description, priority, dates, etc.) is open to
 * whoever owns the task, enforced via assertOwnsTask + assertTaskFieldsEditable in rbac.ts.
 */
export const EMPLOYEE_RESTRICTED_TASK_FIELDS = ["assignedToId", "additionalAssignedToIds"] as const;

export const ACCESS_TOKEN_COOKIE = "task_tracker_at";
export const REFRESH_TOKEN_COOKIE = "task_tracker_rt";

/**
 * Columns the spreadsheet task view allows sorting on. Shared between the client (which column
 * headers render as clickable) and the server (which validates `sortBy` and knows how to turn
 * it into a Prisma `orderBy`, including the relation lookups for employee/company/department) so
 * the two can't drift out of sync.
 */
export const TASK_SORT_FIELDS = [
  "taskNumber",
  "employee",
  "company",
  "department",
  "title",
  "priority",
  "status",
  "assignedDate",
  "dueDate",
  "completedDate",
  "progressPercent",
  "remarks",
] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

export const EXPENSE_STATUSES = ["UNPAID", "PAID"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_STATUS_META: Record<ExpenseStatus, { label: string; badgeClass: string }> = {
  UNPAID: {
    label: "Unpaid",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  PAID: {
    label: "Paid",
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  },
};

export const UNBILLED_ENTRY_STATUSES = ["PENDING", "DONE"] as const;
export type UnbilledEntryStatus = (typeof UNBILLED_ENTRY_STATUSES)[number];

export const UNBILLED_ENTRY_STATUS_META: Record<UnbilledEntryStatus, { label: string; badgeClass: string }> = {
  PENDING: {
    label: "Pending",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  DONE: {
    label: "Done",
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  },
};

export const AUDIT_ACTIONS = ["LOGIN", "LOGIN_FAILED", "LOGOUT", "CREATE", "UPDATE", "DELETE"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  "AUTH",
  "TASK",
  "EXPENSE",
  "UNBILLED_ENTRY",
  "EMPLOYEE",
  "COMPANY",
  "DEPARTMENT",
  "CATEGORY",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/** Columns the Employee Performance report allows sorting on — see getEmployeePerformanceReport. */
export const EMPLOYEE_PERFORMANCE_SORT_FIELDS = [
  "name",
  "total",
  "completed",
  "pending",
  "delayed",
  "avgDelayDays",
  "avgCompletionDays",
  "completionPercent",
] as const;
export type EmployeePerformanceSortField = (typeof EMPLOYEE_PERFORMANCE_SORT_FIELDS)[number];
