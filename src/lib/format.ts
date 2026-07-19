import { format, formatDistanceToNow } from "date-fns";

export function formatDate(date: Date | string | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!date) return "—";
  return format(new Date(date), pattern);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  return format(new Date(date), "yyyy-MM-dd");
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
