import { EXPENSE_STATUS_META, type ExpenseStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ExpenseStatusBadge({ status, className }: { status: ExpenseStatus; className?: string }) {
  const meta = EXPENSE_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.badgeClass,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
