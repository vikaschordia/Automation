import { ADMIN_ONLY_TASK_FIELDS, EMPLOYEE_EDITABLE_TASK_FIELDS, type Role } from "@/lib/constants";
import { ApiError } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import type { TaskCreateInput } from "@/lib/validations/task";

const ADMIN_ONLY_ROUTES_MESSAGE = "Only admins can perform this action";

export function assertAdmin(role: Role): void {
  if (role !== "ADMIN") throw new ApiError(403, ADMIN_ONLY_ROUTES_MESSAGE);
}

/**
 * Employees may only send the fields listed in EMPLOYEE_EDITABLE_TASK_FIELDS when updating a
 * task. Admins may send any field. Silently rejecting instead of silently dropping the field
 * avoids a client believing an edit succeeded when the server ignored it.
 */
export function assertTaskFieldsEditable(role: Role, patchKeys: string[]): void {
  if (role === "ADMIN") return;
  const disallowed = patchKeys.filter(
    (key) => !(EMPLOYEE_EDITABLE_TASK_FIELDS as readonly string[]).includes(key),
  );
  if (disallowed.length > 0) {
    throw new ApiError(
      403,
      `Employees cannot edit: ${disallowed.join(", ")}. Editable fields are: ${EMPLOYEE_EDITABLE_TASK_FIELDS.join(", ")}`,
    );
  }
}

export function assertOwnsTask(role: Role, sessionEmployeeId: string | null, taskAssignedToId: string): void {
  if (role === "ADMIN") return;
  if (!sessionEmployeeId || sessionEmployeeId !== taskAssignedToId) {
    throw new ApiError(403, "You can only view or update your own tasks");
  }
}

export const adminOnlyTaskFields = ADMIN_ONLY_TASK_FIELDS;

/**
 * Employees can now add their own tasks (all fields open, same create form as admin) — but only
 * for themselves, under a company they're actually mapped to. Admins are unrestricted, as before.
 */
export async function assertEmployeeTaskCreateAllowed(session: SessionPayload, input: TaskCreateInput): Promise<void> {
  if (session.role === "ADMIN") return;

  if (!session.employeeId) {
    throw new ApiError(403, "No employee profile is linked to this account");
  }
  if (input.assignedToId !== session.employeeId) {
    throw new ApiError(403, "You can only create tasks assigned to yourself");
  }
  if (input.additionalAssignedToIds && input.additionalAssignedToIds.length > 0) {
    throw new ApiError(403, "You cannot assign tasks to other employees");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { companyId: true, additionalCompanyIds: true },
  });
  const allowedCompanyIds = new Set([employee?.companyId, ...(employee?.additionalCompanyIds ?? [])]);
  if (!employee || !allowedCompanyIds.has(input.companyId)) {
    throw new ApiError(403, "You can only create tasks under a company you're mapped to");
  }

  const department = await prisma.department.findUnique({ where: { id: input.departmentId }, select: { companyId: true } });
  if (!department || department.companyId !== input.companyId) {
    throw new ApiError(400, "Invalid department for the selected company");
  }
}

/**
 * Monthly Expenses is admin-only by default, but an employee can be individually opted in
 * (Employee.canViewExpenses, toggled from the employee form) for full access — view, export,
 * add, edit, mark paid/unpaid, and delete — same as an admin, just scoped to this one feature.
 */
export async function assertExpenseAccess(session: SessionPayload): Promise<void> {
  if (session.role === "ADMIN") return;
  const employee = session.employeeId
    ? await prisma.employee.findUnique({ where: { id: session.employeeId }, select: { canViewExpenses: true } })
    : null;
  if (!employee?.canViewExpenses) {
    throw new ApiError(403, "You don't have access to Monthly Expenses");
  }
}
