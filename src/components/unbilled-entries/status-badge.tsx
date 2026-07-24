import { UNBILLED_ENTRY_STATUS_META, type UnbilledEntryStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function UnbilledEntryStatusBadge({ status, className }: { status: UnbilledEntryStatus; className?: string }) {
  const meta = UNBILLED_ENTRY_STATUS_META[status];
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
