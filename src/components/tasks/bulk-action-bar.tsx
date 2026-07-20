"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { useBulkUpdateTasks, useBulkDeleteTasks } from "@/hooks/use-tasks";
import { TASK_PRIORITIES, TASK_STATUSES, PRIORITY_META, STATUS_META } from "@/lib/constants";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function BulkActionBar({ taskIds, onClear }: { taskIds: number[]; onClear: () => void }) {
  const mutation = useBulkUpdateTasks();
  const deleteMutation = useBulkDeleteTasks();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  if (taskIds.length === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5 shadow-sm">
      <span className="text-sm font-medium">{taskIds.length} selected</span>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Set status</span>
        <Select
          onValueChange={(v) => mutation.mutate({ taskIds, patch: { status: v } }, { onSuccess: onClear })}
          disabled={mutation.isPending || deleteMutation.isPending}
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="Choose..." />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Set priority</span>
        <Select
          onValueChange={(v) => mutation.mutate({ taskIds, patch: { priority: v } }, { onSuccess: onClear })}
          disabled={mutation.isPending || deleteMutation.isPending}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Choose..." />
          </SelectTrigger>
          <SelectContent>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_META[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="h-4 w-px bg-border" />
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={mutation.isPending || deleteMutation.isPending}
        onClick={() => setConfirmDeleteOpen(true)}
      >
        <Trash2 className="size-3.5" /> Delete
      </Button>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
        <X className="size-3.5" /> Clear selection
      </Button>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete ${taskIds.length} task${taskIds.length === 1 ? "" : "s"}?`}
        description="This moves the selected tasks to the deleted list. This can't be undone from the UI yet."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(taskIds, {
            onSuccess: () => {
              setConfirmDeleteOpen(false);
              onClear();
            },
          });
        }}
      />
    </div>
  );
}
