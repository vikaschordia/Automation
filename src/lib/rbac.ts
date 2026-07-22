import { ADMIN_ONLY_TASK_FIELDS, EMPLOYEE_EDITABLE_TASK_FIELDS, type Role } from "@/lib/constants";
import { ApiError } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

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
 * Monthly Expenses is admin-only by default, but an employee can be individually opted in
 * (Employee.canViewExpenses, toggled from the employee form) for read-only access — viewing and
 * exporting, never creating/editing/deleting/marking paid, which stay admin-only regardless.
 */
export async function assertExpenseViewAccess(session: SessionPayload): Promise<void> {
  if (session.role === "ADMIN") return;
  const employee = session.employeeId
    ? await prisma.employee.findUnique({ where: { id: session.employeeId }, select: { canViewExpenses: true } })
    : null;
  if (!employee?.canViewExpenses) {
    throw new ApiError(403, "You don't have access to Monthly Expenses");
  }
}
