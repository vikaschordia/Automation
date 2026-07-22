"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useUpdateTask } from "@/hooks/use-tasks";
import { CompleteTaskDialog } from "@/components/tasks/complete-task-dialog";
import { TASK_STATUSES, STATUS_META, type TaskStatus } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function EditableStatusCell({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const mutation = useUpdateTask({ silent: true });
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleChange(v: TaskStatus) {
    // Marking Completed without asking is what causes delay to get computed from "whenever this
    // dropdown happened to get clicked" instead of the real completion date — ask instead of
    // silently defaulting server-side.
    if (v === "COMPLETED" && status !== "COMPLETED") {
      setConfirmOpen(true);
      return;
    }
    mutation.mutate({ id: taskId, input: { status: v } });
  }

  return (
    <>
      <Select value={status} onValueChange={handleChange}>
        <SelectTrigger
          size="sm"
          className={cn("h-7 w-full border-transparent bg-transparent px-2 shadow-none hover:border-input", mutation.isPending && "opacity-60")}
        >
          <SelectValue>
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_META[status].badgeClass)}>
              {STATUS_META[status].label}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_META[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <CompleteTaskDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        loading={mutation.isPending}
        onConfirm={(completedDate) =>
          mutation.mutate(
            { id: taskId, input: { status: "COMPLETED", completedDate } },
            { onSuccess: () => setConfirmOpen(false) },
          )
        }
      />
    </>
  );
}

export function EditableProgressCell({ taskId, progress }: { taskId: string; progress: number }) {
  const mutation = useUpdateTask({ silent: true });
  const [value, setValue] = useState(progress);
  // Re-sync local draft when the server value changes underneath us (refetch, another editor's
  // change) — done during render per React's "adjusting state when a prop changes" pattern,
  // rather than a useEffect, so there's no extra render pass.
  const [lastSeenProgress, setLastSeenProgress] = useState(progress);
  if (progress !== lastSeenProgress) {
    setLastSeenProgress(progress);
    setValue(progress);
  }

  return (
    <div className="flex items-center gap-2">
      <Progress value={value} className="h-1.5 w-14" />
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onBlur={() => {
          if (value !== progress) mutation.mutate({ id: taskId, input: { progressPercent: value } });
        }}
        className="h-7 w-14 px-1.5 text-xs"
      />
    </div>
  );
}

export function EditableRemarksCell({ taskId, remarks }: { taskId: string; remarks: string | null }) {
  const mutation = useUpdateTask({ silent: true });
  const [value, setValue] = useState(remarks ?? "");
  const [lastSeenRemarks, setLastSeenRemarks] = useState(remarks ?? "");
  if ((remarks ?? "") !== lastSeenRemarks) {
    setLastSeenRemarks(remarks ?? "");
    setValue(remarks ?? "");
  }

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder="Add remarks..."
        title={value || undefined}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== (remarks ?? "")) mutation.mutate({ id: taskId, input: { remarks: value } });
        }}
        className="h-7 min-w-40 border-transparent bg-transparent px-2 text-xs shadow-none hover:border-input"
      />
      {mutation.isPending && <Loader2 className="absolute right-1.5 top-1.5 size-3.5 animate-spin text-muted-foreground" />}
      {mutation.isSuccess && !mutation.isPending && <Check className="absolute right-1.5 top-1.5 size-3.5 text-emerald-600" />}
    </div>
  );
}
