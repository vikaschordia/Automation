"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { unbilledEntryCreateSchema, type UnbilledEntryCreateInput } from "@/lib/validations/unbilled-entry";
import { useCreateUnbilledEntry, useUpdateUnbilledEntry, type UnbilledEntryRow } from "@/hooks/use-unbilled-entries";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Defaults the expected date to the month currently being viewed, not necessarily this calendar
 *  month — mirrors ExpenseFormDialog's defaultDueDate. */
function defaultExpectedDate(year: number, month: number): string {
  const day = Math.min(new Date().getDate(), new Date(year, month, 0).getDate());
  return toDateInputValue(new Date(year, month - 1, day));
}

type EntryFormValues = z.input<typeof unbilledEntryCreateSchema>;

export function EntryFormDialog({
  open,
  onOpenChange,
  entry,
  year,
  month,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: UnbilledEntryRow | null;
  year: number;
  month: number;
}) {
  const isEdit = !!entry;
  const createMutation = useCreateUnbilledEntry();
  const updateMutation = useUpdateUnbilledEntry();
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EntryFormValues, unknown, UnbilledEntryCreateInput>({
    resolver: zodResolver(unbilledEntryCreateSchema),
    defaultValues: { description: "", expectedDate: new Date(), expectedAmount: 0, isRecurring: false, remarks: "" },
  });

  useEffect(() => {
    if (!open) return;
    if (entry) {
      reset({
        description: entry.description,
        expectedDate: new Date(entry.expectedDate),
        expectedAmount: entry.expectedAmount,
        isRecurring: entry.isRecurring,
        remarks: entry.remarks ?? "",
      });
    } else {
      reset({
        description: "",
        expectedDate: new Date(defaultExpectedDate(year, month)),
        expectedAmount: 0,
        isRecurring: false,
        remarks: "",
      });
    }
  }, [open, entry, year, month, reset]);

  async function onSubmit(values: UnbilledEntryCreateInput) {
    if (isEdit && entry) {
      await updateMutation.mutateAsync({ id: entry.id, input: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    if (!createMutation.isError && !updateMutation.isError) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit entry" : "Add entry"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this entry's details."
              : "Recurring entries automatically carry forward — you'll just need to confirm the date and amount each month."}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Entry description</Label>
            <Input id="description" placeholder="e.g. Consulting fee — Client X" {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedDate">Expected date</Label>
              <Input
                id="expectedDate"
                type="date"
                defaultValue={toDateInputValue(watch("expectedDate") as Date)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setValue("expectedDate", new Date(e.target.value));
                }}
              />
              {errors.expectedDate && <p className="text-xs text-destructive">{errors.expectedDate.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedAmount">Expected amount</Label>
              <Input
                id="expectedAmount"
                type="number"
                min={0}
                step="0.01"
                {...register("expectedAmount", { valueAsNumber: true })}
              />
              {errors.expectedAmount && <p className="text-xs text-destructive">{errors.expectedAmount.message}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div>
              <Label htmlFor="isRecurring" className="cursor-pointer">Recurring every month</Label>
              <p className="text-xs text-muted-foreground">Off = one-time, won&apos;t appear next month.</p>
            </div>
            <Switch id="isRecurring" checked={watch("isRecurring")} onCheckedChange={(v) => setValue("isRecurring", v)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Textarea id="remarks" rows={2} placeholder="Notes about this entry" {...register("remarks")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
