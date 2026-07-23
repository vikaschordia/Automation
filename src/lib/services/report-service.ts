import { prisma } from "@/lib/prisma";
import { calculateDelayDays, isOverdue } from "@/lib/delay";
import { TASK_PRIORITIES, EMPLOYEE_PERFORMANCE_SORT_FIELDS, type EmployeePerformanceSortField } from "@/lib/constants";

export interface EmployeePerformanceRow {
  employeeId: string;
  employeeCode: string;
  name: string;
  designation: string;
  company: string;
  department: string;
  total: number;
  completed: number;
  pending: number;
  delayed: number;
  avgDelayDays: number;
  completionPercent: number;
  avgCompletionDays: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
}

export async function getEmployeePerformanceReport(filters?: {
  companyId?: string;
  departmentId?: string;
  employeeId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}): Promise<EmployeePerformanceRow[]> {
  const employees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      // An employee viewing their own Reports tab only ever sees their own row — company/
      // department filters below are moot in that case (there's only ever one possible row).
      ...(filters?.employeeId ? { id: filters.employeeId } : {}),
      // Matches primary company OR any additional company the employee is mapped to, same as the
      // Employees list filter — an employee mapped into this company should show up in its report.
      ...(filters?.companyId
        ? { OR: [{ companyId: filters.companyId }, { additionalCompanies: { some: { id: filters.companyId } } }] }
        : {}),
      departmentId: filters?.departmentId,
    },
    include: {
      company: { select: { name: true } },
      department: { select: { name: true } },
      assignedTasks: { where: { deletedAt: null } },
    },
    orderBy: { name: "asc" },
  });

  const rows = employees.map((employee) => {
    const tasks = employee.assignedTasks;
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const pending = tasks.filter((t) => t.status === "PENDING").length;
    const delayed = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && isOverdue(t.dueDate, t.completedDate)).length;

    const delays = tasks.map((t) => calculateDelayDays(t.dueDate, t.completedDate));
    const avgDelayDays = delays.length === 0 ? 0 : round1(delays.reduce((a, b) => a + b, 0) / delays.length);

    const completedTasks = tasks.filter((t) => t.status === "COMPLETED" && t.completedDate);
    const avgCompletionDays =
      completedTasks.length === 0
        ? 0
        : round1(
            Math.max(
              0,
              completedTasks.reduce((sum, t) => sum + (t.completedDate!.getTime() - t.assignedDate.getTime()) / 86400000, 0) /
                completedTasks.length,
            ),
          );

    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      designation: employee.designation,
      company: employee.company.name,
      department: employee.department.name,
      total,
      completed,
      pending,
      delayed,
      avgDelayDays,
      completionPercent: total === 0 ? 0 : round1((completed / total) * 100),
      avgCompletionDays,
      p1Count: tasks.filter((t) => t.priority === TASK_PRIORITIES[0]).length,
      p2Count: tasks.filter((t) => t.priority === TASK_PRIORITIES[1]).length,
      p3Count: tasks.filter((t) => t.priority === TASK_PRIORITIES[2]).length,
    };
  });

  return sortPerformanceRows(rows, filters?.sortBy, filters?.sortDir ?? "asc");
}

/**
 * The dataset here is one row per active employee — always small, even at hundreds of employees —
 * so sorting the already-computed array in JS is simpler and just as correct as pushing this
 * through Prisma, and it's the only option for the aggregate columns (avgDelayDays, completionPercent,
 * etc.) that don't exist as raw DB columns to order by.
 */
function sortPerformanceRows(rows: EmployeePerformanceRow[], sortByRaw: string | undefined, sortDir: "asc" | "desc") {
  const sortBy: EmployeePerformanceSortField = (EMPLOYEE_PERFORMANCE_SORT_FIELDS as readonly string[]).includes(
    sortByRaw ?? "",
  )
    ? (sortByRaw as EmployeePerformanceSortField)
    : "name";

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "desc" ? -cmp : cmp;
  });
  return sorted;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
