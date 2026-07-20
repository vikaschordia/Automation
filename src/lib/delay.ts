/**
 * Delay logic (per spec):
 *  - If completed after the due date: delay = completedDate − dueDate
 *  - If not completed and overdue: delay = today − dueDate
 *  - Otherwise: delay = 0
 * Always expressed in whole days, never negative.
 */
export function calculateDelayDays(dueDate: Date, completedDate: Date | null, today: Date = new Date()): number {
  const due = startOfDay(dueDate);
  if (completedDate) {
    const completed = startOfDay(completedDate);
    return Math.max(0, diffInDays(completed, due));
  }
  return Math.max(0, diffInDays(startOfDay(today), due));
}

export function isOverdue(dueDate: Date, completedDate: Date | null, today: Date = new Date()): boolean {
  if (completedDate) return false;
  return startOfDay(today).getTime() > startOfDay(dueDate).getTime();
}

export function isDueToday(dueDate: Date, today: Date = new Date()): boolean {
  return startOfDay(dueDate).getTime() === startOfDay(today).getTime();
}

export function isDueTomorrow(dueDate: Date, today: Date = new Date()): boolean {
  const tomorrow = new Date(startOfDay(today));
  tomorrow.setDate(tomorrow.getDate() + 1);
  return startOfDay(dueDate).getTime() === tomorrow.getTime();
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Parses a "yyyy-mm-dd" string (from a date filter/input) as LOCAL midnight, not UTC midnight.
 * `new Date("yyyy-mm-dd")` parses as UTC per the ES spec — in any timezone ahead of UTC (e.g.
 * IST, UTC+5:30) that silently shifts the date backward for part of the day, and doing date-range
 * math against it produces off-by-one / empty-range bugs. Splitting into components and using the
 * `Date(year, month, day)` constructor sidesteps the ambiguity entirely.
 */
export function parseLocalDateString(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function diffInDays(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}
