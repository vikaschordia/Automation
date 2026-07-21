"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shown whenever a task (or a batch of tasks) is about to be marked Completed. Without this,
 * completedDate silently defaults to "right now" — the moment someone happened to click the
 * status dropdown — rather than when the work actually finished, which throws off the delay
 * calculation (delay is computed against completedDate). This makes the date explicit and
 * editable at the moment of completion instead.
 */
export function CompleteTaskDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  taskCount = 1,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (completedDate: Date) => void;
  loading?: boolean;
  taskCount?: number;
}) {
  const [dateValue, setDateValue] = useState(toDateInputValue(new Date()));
  // Reset the date to today each time the dialog opens — done during render (React's
  // "adjusting state when a prop changes" pattern) rather than a useEffect, so there's no extra
  // render pass and no risk of the effect firing before the dialog is actually visible.
  const [lastSeenOpen, setLastSeenOpen] = useState(open);
  if (open !== lastSeenOpen) {
    setLastSeenOpen(open);
    if (open) setDateValue(toDateInputValue(new Date()));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark {taskCount > 1 ? `${taskCount} tasks` : "task"} as Completed</DialogTitle>
          <DialogDescription>
            When was {taskCount > 1 ? "this work" : "it"} actually finished? Delay is calculated from this date, not
            today&apos;s date.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="complete-task-date">Completion date</Label>
          <Input
            id="complete-task-date"
            type="date"
            value={dateValue}
            max={toDateInputValue(new Date())}
            onChange={(e) => {
              if (!e.target.value) return;
              setDateValue(e.target.value);
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" disabled={loading} onClick={() => onConfirm(new Date(dateValue))}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Mark Completed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
