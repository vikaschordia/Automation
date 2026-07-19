import { prisma } from "@/lib/prisma";
import { calculateDelayDays, isOverdue } from "@/lib/delay";
import { TASK_PRIORITIES } from "@/lib/constants";

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

export async function getEmployeePerformanceReport(filters?: { companyId?: string; departmentId?: string }): Promise<EmployeePerformanceRow[]> {
  const employees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      companyId: filters?.companyId,
      departmentId: filters?.departmentId,
    },
    include: {
      company: { select: { name: true } },
      department: { select: { name: true } },
      assignedTasks: { where: { deletedAt: null } },
    },
    orderBy: { name: "asc" },
  });

  return employees.map((employee) => {
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
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
