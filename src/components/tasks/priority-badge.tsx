import { PRIORITY_META, type TaskPriority } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.badgeClass,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
