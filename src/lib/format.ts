import { format, formatDistanceToNow } from "date-fns";

/**
 * `new Date(...)` doesn't throw on bad input — it silently produces an "Invalid Date" (a Date
 * whose getTime() is NaN). date-fns' format()/formatDistanceToNow() DO throw on those
 * ("RangeError: Invalid time value"), which crashes whatever called them. Every formatter below
 * treats an invalid date the same as a missing one instead of ever handing one to date-fns —
 * this is what stands between a user mid-typing a date (briefly producing "") and a crash.
 */
function toValidDate(date: Date | string): Date | null {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: Date | string | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!date) return "—";
  const d = toValidDate(date);
  return d ? format(d, pattern) : "—";
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = toValidDate(date);
  return d ? format(d, "dd MMM yyyy, hh:mm a") : "—";
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = toValidDate(date);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "—";
}

export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = toValidDate(date);
  return d ? format(d, "yyyy-MM-dd") : "";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
