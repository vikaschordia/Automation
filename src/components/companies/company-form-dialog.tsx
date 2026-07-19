"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companySchema, type CompanyInput } from "@/lib/validations/company";
import { useCreateCompany, useUpdateCompany, type CompanyRow } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: CompanyRow | null;
}) {
  const isEdit = !!company;
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: "", code: "", address: "", isActive: true },
  });

  useEffect(() => {
    if (open) {
      reset(
        company
          ? { name: company.name, code: company.code, address: company.address ?? "", isActive: company.isActive }
          : { name: "", code: "", address: "", isActive: true },
      );
    }
  }, [open, company, reset]);

  async function onSubmit(values: CompanyInput) {
    if (isEdit && company) {
      await updateMutation.mutateAsync({ id: company.id, input: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    if (!createMutation.isError && !updateMutation.isError) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit company" : "Add company"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this company's details." : "Companies group departments and employees."}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" placeholder="e.g. Alpha Industries" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Company code</Label>
            <Input id="code" placeholder="e.g. ALPHA" className="uppercase" {...register("code")} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" placeholder="City, Country" {...register("address")} />
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
              {isEdit ? "Save changes" : "Create company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
