"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { expenseCreateSchema, type ExpenseCreateInput } from "@/lib/validations/expense";
import { useCreateExpense, useUpdateExpense, type ExpenseRow } from "@/hooks/use-expenses";
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

/** Defaults the due date to the month currently being viewed (e.g. clicking "Add expense" while
 *  looking at August pre-fills a due date in August), not necessarily this calendar month. */
function defaultDueDate(year: number, month: number): string {
  const day = Math.min(new Date().getDate(), new Date(year, month, 0).getDate());
  return toDateInputValue(new Date(year, month - 1, day));
}

type ExpenseFormValues = z.input<typeof expenseCreateSchema>;

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  year,
  month,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseRow | null;
  year: number;
  month: number;
}) {
  const isEdit = !!expense;
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues, unknown, ExpenseCreateInput>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: { name: "", dueDate: new Date(), amount: 0, isRecurring: false, remarks: "" },
  });

  useEffect(() => {
    if (!open) return;
    if (expense) {
      reset({
        name: expense.name,
        dueDate: new Date(expense.dueDate),
        amount: expense.amount,
        isRecurring: expense.isRecurring,
        remarks: expense.remarks ?? "",
      });
    } else {
      reset({ name: "", dueDate: new Date(defaultDueDate(year, month)), amount: 0, isRecurring: false, remarks: "" });
    }
  }, [open, expense, year, month, reset]);

  async function onSubmit(values: ExpenseCreateInput) {
    if (isEdit && expense) {
      await updateMutation.mutateAsync({ id: expense.id, input: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    if (!createMutation.isError && !updateMutation.isError) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this expense's details."
              : "Recurring expenses automatically carry forward — you'll just need to confirm the date and amount each month."}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Expense name</Label>
            <Input id="name" placeholder="e.g. Office Rent" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Tentative due date</Label>
              <Input
                id="dueDate"
                type="date"
                defaultValue={toDateInputValue(watch("dueDate") as Date)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setValue("dueDate", new Date(e.target.value));
                }}
              />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Tentative amount</Label>
              <Input id="amount" type="number" min={0} step="0.01" {...register("amount", { valueAsNumber: true })} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
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
            <Textarea id="remarks" rows={2} placeholder="Notes about this expense" {...register("remarks")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
