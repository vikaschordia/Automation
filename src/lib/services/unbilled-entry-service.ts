import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UnbilledEntryCreateInput, UnbilledEntryUpdateInput } from "@/lib/validations/unbilled-entry";

function monthKey(year: number, month: number): number {
  return year * 12 + month;
}

function addMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

/** Same day-of-month next month, clamped to that month's last day (e.g. 31 Jan -> 28/29 Feb). */
function dateForMonth(day: number, year: number, month: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

/**
 * companyFilter: undefined = no restriction (admin's "All Companies"), a single companyId = one
 * company's sub-tab, or string[] = "one of these" (an employee's "All Companies", scoped to the
 * companies they're mapped to — see resolveAccessibleCompanyFilter).
 */
export function monthRangeWhere(year: number, month: number, companyFilter?: string | string[]): Prisma.UnbilledEntryWhereInput {
  return {
    expectedDate: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
    ...(companyFilter ? { companyId: Array.isArray(companyFilter) ? { in: companyFilter } : companyFilter } : {}),
  };
}

/**
 * Same on-demand recurring-month generation as ensureRecurringExpenses (see expense-service.ts):
 * the first time a month later than a recurring series' latest instance is requested, this fills
 * every month in between (copying the previous month's description/amount/day-of-month, resetting
 * status to PENDING), so a recurring entry "automatically appears in next month" without a
 * background scheduler.
 */
export async function ensureRecurringUnbilledEntries(targetYear: number, targetMonth: number): Promise<void> {
  const targetKey = monthKey(targetYear, targetMonth);

  const rows = await prisma.unbilledEntry.findMany({
    where: { recurringGroupId: { not: null } },
    orderBy: { expectedDate: "desc" },
  });

  const latestByGroup = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByGroup.has(row.recurringGroupId!)) latestByGroup.set(row.recurringGroupId!, row);
  }

  const toCreate: Prisma.UnbilledEntryCreateManyInput[] = [];
  for (const latest of latestByGroup.values()) {
    if (!latest.isRecurring) continue;
    const originalDay = latest.expectedDate.getDate();
    let cursorYear = latest.expectedDate.getFullYear();
    let cursorMonth = latest.expectedDate.getMonth() + 1;

    while (monthKey(cursorYear, cursorMonth) < targetKey) {
      [cursorYear, cursorMonth] = addMonth(cursorYear, cursorMonth);
      toCreate.push({
        description: latest.description,
        companyId: latest.companyId,
        expectedDate: dateForMonth(originalDay, cursorYear, cursorMonth),
        expectedAmount: latest.expectedAmount,
        status: "PENDING",
        entryDoneDate: null,
        isRecurring: true,
        recurringGroupId: latest.recurringGroupId,
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.unbilledEntry.createMany({ data: toCreate });
  }
}

export async function listUnbilledEntries(year: number, month: number, companyFilter?: string | string[]) {
  await ensureRecurringUnbilledEntries(year, month);
  return prisma.unbilledEntry.findMany({
    where: monthRangeWhere(year, month, companyFilter),
    orderBy: { expectedDate: "asc" },
    include: { company: { select: { id: true, name: true } } },
  });
}

export async function createUnbilledEntry(input: UnbilledEntryCreateInput) {
  return prisma.unbilledEntry.create({
    data: {
      description: input.description,
      companyId: input.companyId,
      expectedDate: input.expectedDate,
      expectedAmount: input.expectedAmount,
      isRecurring: input.isRecurring,
      recurringGroupId: input.isRecurring ? randomUUID() : null,
      remarks: input.remarks || null,
    },
    include: { company: { select: { id: true, name: true } } },
  });
}

export async function updateUnbilledEntry(id: string, patch: UnbilledEntryUpdateInput) {
  const existing = await prisma.unbilledEntry.findUniqueOrThrow({ where: { id } });

  const data: Prisma.UnbilledEntryUpdateInput = {};
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.companyId !== undefined) data.company = { connect: { id: patch.companyId } };
  if (patch.expectedDate !== undefined) data.expectedDate = patch.expectedDate;
  if (patch.expectedAmount !== undefined) data.expectedAmount = patch.expectedAmount;
  if (patch.remarks !== undefined) data.remarks = patch.remarks || null;

  if (patch.status !== undefined) {
    data.status = patch.status;
    if (patch.status === "DONE") {
      data.entryDoneDate = patch.entryDoneDate ?? new Date();
    } else {
      data.entryDoneDate = null;
    }
  } else if (patch.entryDoneDate !== undefined) {
    data.entryDoneDate = patch.entryDoneDate;
  }

  // Turning recurring on for a previously one-time entry starts a brand-new series from here;
  // turning it off just stops the chain — the row (and its recurringGroupId, if any) stays as-is.
  if (patch.isRecurring !== undefined) {
    data.isRecurring = patch.isRecurring;
    if (patch.isRecurring && !existing.recurringGroupId) {
      data.recurringGroupId = randomUUID();
    }
  }

  return prisma.unbilledEntry.update({ where: { id }, data, include: { company: { select: { id: true, name: true } } } });
}

export async function deleteUnbilledEntry(id: string) {
  await prisma.unbilledEntry.delete({ where: { id } });
}
