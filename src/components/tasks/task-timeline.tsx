import { PlusCircle, Pencil, RefreshCw, CheckCircle2, RotateCcw } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TaskHistoryAction } from "@/lib/constants";

interface HistoryEntry {
  id: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  changedBy: { email: string; role: string };
}

const ACTION_META: Record<TaskHistoryAction, { label: string; icon: typeof PlusCircle; color: string }> = {
  CREATED: { label: "created the task", icon: PlusCircle, color: "text-blue-600 bg-blue-100 dark:bg-blue-950" },
  UPDATED: { label: "updated", icon: Pencil, color: "text-slate-600 bg-slate-100 dark:bg-slate-800" },
  STATUS_CHANGED: { label: "changed status", icon: RefreshCw, color: "text-amber-600 bg-amber-100 dark:bg-amber-950" },
  COMPLETED: { label: "marked as completed", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950" },
  REOPENED: { label: "reopened the task", icon: RotateCcw, color: "text-purple-600 bg-purple-100 dark:bg-purple-950" },
};

function describeField(field: string | null): string {
  if (!field) return "";
  const map: Record<string, string> = {
    status: "status",
    progressPercent: "progress",
    remarks: "remarks",
    completedDate: "completion date",
    priority: "priority",
    dueDate: "due date",
    assignedDate: "assigned date",
    assignedToId: "assignee",
    title: "title",
    description: "description",
    tags: "tags",
    bulk: "multiple fields (bulk update)",
  };
  return map[field] ?? field;
}

export function TaskTimeline({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {history.map((entry) => {
        const meta = ACTION_META[entry.action as TaskHistoryAction] ?? ACTION_META.UPDATED;
        const Icon = meta.icon;
        return (
          <li key={entry.id} className="flex gap-3">
            <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", meta.color)}>
              <Icon className="size-3.5" />
            </div>
            <div className="flex-1 pb-0.5">
              <p className="text-sm">
                <span className="font-medium">{entry.changedBy.email}</span> {meta.label}
                {entry.field && entry.action === "UPDATED" ? ` — ${describeField(entry.field)}` : ""}
                {entry.oldValue && entry.newValue && entry.action !== "CREATED" && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({entry.oldValue} → {entry.newValue})
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
