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

/** Mirrors CompleteTaskDialog: don't let paidDate silently default to "right now" — ask for the
 *  actual payment date at the moment an expense is marked Paid. */
export function MarkPaidDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  expenseName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (paidDate: Date) => void;
  loading?: boolean;
  expenseName?: string;
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
          <DialogTitle>Mark {expenseName ? `"${expenseName}"` : "expense"} as Paid</DialogTitle>
          <DialogDescription>When was it actually paid?</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paid-date">Paid date</Label>
          <Input
            id="paid-date"
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
            Mark Paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
