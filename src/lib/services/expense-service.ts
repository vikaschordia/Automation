import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExpenseCreateInput, ExpenseUpdateInput } from "@/lib/validations/expense";

function monthKey(year: number, month: number): number {
  return year * 12 + month;
}

function addMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

/** Same day-of-month next month, clamped to that month's last day (e.g. 31 Jan -> 28/29 Feb). */
function dueDateForMonth(day: number, year: number, month: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

/**
 * companyFilter: undefined = no company restriction (admin viewing "All Companies"), a single
 * companyId = one company's sub-tab, or string[] = "one of these" (an employee's "All Companies"
 * view, scoped to the companies they're mapped to — see resolveAccessibleCompanyFilter).
 */
export function monthRangeWhere(year: number, month: number, companyFilter?: string | string[]): Prisma.MonthlyExpenseWhereInput {
  return {
    dueDate: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
    ...(companyFilter ? { companyId: Array.isArray(companyFilter) ? { in: companyFilter } : companyFilter } : {}),
  };
}

/**
 * A recurring expense's future months aren't pre-created — the first time anyone requests a
 * month later than the latest existing instance in its series, this fills every month in
 * between (copying the previous month's name/amount/day-of-month, resetting status to UNPAID),
 * which is what makes a recurring expense "automatically appear in next month" without a
 * background scheduler (this app only runs while someone has it open). Idempotent: calling it
 * again for the same or an earlier month is a no-op since the series is already caught up.
 */
export async function ensureRecurringExpenses(targetYear: number, targetMonth: number): Promise<void> {
  const targetKey = monthKey(targetYear, targetMonth);

  const rows = await prisma.monthlyExpense.findMany({
    where: { recurringGroupId: { not: null } },
    orderBy: { dueDate: "desc" },
  });

  const latestByGroup = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByGroup.has(row.recurringGroupId!)) latestByGroup.set(row.recurringGroupId!, row);
  }

  const toCreate: Prisma.MonthlyExpenseCreateManyInput[] = [];
  for (const latest of latestByGroup.values()) {
    if (!latest.isRecurring) continue;
    const originalDay = latest.dueDate.getDate();
    let cursorYear = latest.dueDate.getFullYear();
    let cursorMonth = latest.dueDate.getMonth() + 1;

    while (monthKey(cursorYear, cursorMonth) < targetKey) {
      [cursorYear, cursorMonth] = addMonth(cursorYear, cursorMonth);
      toCreate.push({
        name: latest.name,
        companyId: latest.companyId,
        dueDate: dueDateForMonth(originalDay, cursorYear, cursorMonth),
        amount: latest.amount,
        status: "UNPAID",
        paidDate: null,
        isRecurring: true,
        recurringGroupId: latest.recurringGroupId,
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.monthlyExpense.createMany({ data: toCreate });
  }
}

export async function listExpenses(year: number, month: number, companyFilter?: string | string[]) {
  await ensureRecurringExpenses(year, month);
  return prisma.monthlyExpense.findMany({
    where: monthRangeWhere(year, month, companyFilter),
    orderBy: { dueDate: "asc" },
    include: { company: { select: { id: true, name: true } } },
  });
}

export async function createExpense(input: ExpenseCreateInput) {
  return prisma.monthlyExpense.create({
    data: {
      name: input.name,
      companyId: input.companyId,
      dueDate: input.dueDate,
      amount: input.amount,
      isRecurring: input.isRecurring,
      recurringGroupId: input.isRecurring ? randomUUID() : null,
      remarks: input.remarks || null,
    },
    include: { company: { select: { id: true, name: true } } },
  });
}

export async function updateExpense(id: string, patch: ExpenseUpdateInput) {
  const existing = await prisma.monthlyExpense.findUniqueOrThrow({ where: { id } });

  const data: Prisma.MonthlyExpenseUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.companyId !== undefined) data.company = { connect: { id: patch.companyId } };
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate;
  if (patch.amount !== undefined) data.amount = patch.amount;
  if (patch.remarks !== undefined) data.remarks = patch.remarks || null;

  if (patch.status !== undefined) {
    data.status = patch.status;
    if (patch.status === "PAID") {
      data.paidDate = patch.paidDate ?? new Date();
    } else {
      data.paidDate = null;
    }
  } else if (patch.paidDate !== undefined) {
    data.paidDate = patch.paidDate;
  }

  // Turning recurring on for a previously one-time expense starts a brand-new series from here;
  // turning it off just stops the chain — the row (and its recurringGroupId, if any) stays as-is.
  if (patch.isRecurring !== undefined) {
    data.isRecurring = patch.isRecurring;
    if (patch.isRecurring && !existing.recurringGroupId) {
      data.recurringGroupId = randomUUID();
    }
  }

  return prisma.monthlyExpense.update({ where: { id }, data, include: { company: { select: { id: true, name: true } } } });
}

export async function deleteExpense(id: string) {
  await prisma.monthlyExpense.delete({ where: { id } });
}
