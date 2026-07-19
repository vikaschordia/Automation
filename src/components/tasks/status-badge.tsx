import { STATUS_META, type TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const meta = STATUS_META[status];
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
