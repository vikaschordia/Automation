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

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffInDays(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}
