import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  tone?: "default" | "danger" | "warning" | "success";
  /** When set, the whole card links to the filtered task list (e.g. /tasks?status=PENDING). */
  href?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    danger: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  };

  const content = (
    <>
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-3 rounded-lg border bg-card p-4">{content}</div>;
}
