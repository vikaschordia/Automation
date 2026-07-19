"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { departmentSchema, type DepartmentInput } from "@/lib/validations/department";
import { useCreateDepartment, useUpdateDepartment, type DepartmentRow } from "@/hooks/use-departments";
import { useCompanies } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: DepartmentRow | null;
}) {
  const isEdit = !!department;
  const { data: companies } = useCompanies();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "", companyId: "", isActive: true },
  });

  useEffect(() => {
    if (open) {
      reset(
        department
          ? { name: department.name, companyId: department.companyId, isActive: department.isActive }
          : { name: "", companyId: "", isActive: true },
      );
    }
  }, [open, department, reset]);

  async function onSubmit(values: DepartmentInput) {
    if (isEdit && department) {
      await updateMutation.mutateAsync({ id: department.id, input: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    if (!createMutation.isError && !updateMutation.isError) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit department" : "Add department"}</DialogTitle>
          <DialogDescription>Departments belong to exactly one company.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Department name</Label>
            <Input id="name" placeholder="e.g. Accounts" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Company</Label>
            <Select value={watch("companyId")} onValueChange={(v) => setValue("companyId", v, { shouldValidate: true })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.companyId && <p className="text-xs text-destructive">{errors.companyId.message}</p>}
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            <Switch id="isActive" checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", v)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
