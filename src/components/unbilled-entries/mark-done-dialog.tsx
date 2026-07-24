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

/** Mirrors MarkPaidDialog: don't let entryDoneDate silently default to "right now" — ask for the
 *  actual date at the moment an entry is marked Done. */
export function MarkDoneDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  entryDescription,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (entryDoneDate: Date) => void;
  loading?: boolean;
  entryDescription?: string;
}) {
  const [dateValue, setDateValue] = useState(toDateInputValue(new Date()));
  const [lastSeenOpen, setLastSeenOpen] = useState(open);
  if (open !== lastSeenOpen) {
    setLastSeenOpen(open);
    if (open) setDateValue(toDateInputValue(new Date()));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark {entryDescription ? `"${entryDescription}"` : "entry"} as Done</DialogTitle>
          <DialogDescription>When was the entry actually done?</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="entry-done-date">Entry done date</Label>
          <Input
            id="entry-done-date"
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
            Mark Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
