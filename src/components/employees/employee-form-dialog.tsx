"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import { employeeSchema, type EmployeeInput } from "@/lib/validations/employee";

type EmployeeFormValues = z.input<typeof employeeSchema>;
import { useCreateEmployee, useUpdateEmployee, useEmployees, type EmployeeRow } from "@/hooks/use-employees";
import { useCompanies } from "@/hooks/use-companies";
import { useDepartments } from "@/hooks/use-departments";
import { EMPLOYEE_STATUSES } from "@/lib/constants";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeRow | null;
}) {
  const isEdit = !!employee;
  const { data: companies } = useCompanies();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormValues, unknown, EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeCode: "",
      name: "",
      designation: "",
      email: "",
      phone: "",
      status: "ACTIVE",
      joiningDate: new Date(),
      departmentId: "",
      companyId: "",
      additionalCompanyIds: [],
      managerId: null,
      canViewExpenses: false,
      canViewUnbilledEntries: false,
      createLogin: true,
    },
  });

  const companyId = watch("companyId");
  const { data: departments } = useDepartments(companyId || undefined);
  const { data: sameDeptEmployees } = useEmployees(watch("departmentId") ? { departmentId: watch("departmentId") } : undefined);
  const managerOptions = useMemo(
    () => (sameDeptEmployees ?? []).filter((e) => e.id !== employee?.id),
    [sameDeptEmployees, employee],
  );

  useEffect(() => {
    if (open) {
      reset(
        employee
          ? {
              employeeCode: employee.employeeCode,
              name: employee.name,
              designation: employee.designation,
              email: employee.email,
              phone: employee.phone ?? "",
              status: employee.status,
              joiningDate: new Date(employee.joiningDate),
              departmentId: employee.departmentId,
              companyId: employee.companyId,
              additionalCompanyIds: employee.additionalCompanies.map((c) => c.id),
              managerId: employee.managerId,
              canViewExpenses: employee.canViewExpenses,
              canViewUnbilledEntries: employee.canViewUnbilledEntries,
              createLogin: false,
            }
          : {
              employeeCode: "",
              name: "",
              designation: "",
              email: "",
              phone: "",
              status: "ACTIVE",
              joiningDate: new Date(),
              departmentId: "",
              companyId: "",
              additionalCompanyIds: [],
              managerId: null,
              canViewExpenses: false,
              canViewUnbilledEntries: false,
              createLogin: true,
            },
      );
    }
  }, [open, employee, reset]);

  async function onSubmit(values: EmployeeInput) {
    if (isEdit && employee) {
      const { createLogin, ...rest } = values;
      void createLogin;
      await updateMutation.mutateAsync({ id: employee.id, input: rest });
    } else {
      await createMutation.mutateAsync(values);
    }
    if (!createMutation.isError && !updateMutation.isError) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
          <DialogDescription>
            Employee master data — one primary company and department, plus any additional companies they&apos;re mapped to.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form id="employee-form" className="flex flex-col gap-4 pb-1" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="employeeCode">Employee code</Label>
                <Input id="employeeCode" placeholder="EMP011" {...register("employeeCode")} />
                {errors.employeeCode && <p className="text-xs text-destructive">{errors.employeeCode.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" placeholder="e.g. Accounts Executive" {...register("designation")} />
                {errors.designation && <p className="text-xs text-destructive">{errors.designation.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="joiningDate">Joining date</Label>
                <Input
                  id="joiningDate"
                  type="date"
                  defaultValue={toDateInputValue(watch("joiningDate") as Date)}
                  onChange={(e) => {
                    // While typing a date manually, the native input briefly reports "" between
                    // keystrokes (e.g. year typed but not month/day yet) — only commit once it's
                    // a complete, valid date, so an Invalid Date never lands in form state.
                    if (!e.target.value) return;
                    setValue("joiningDate", new Date(e.target.value));
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" {...register("phone")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Company</Label>
                <Select
                  value={watch("companyId")}
                  onValueChange={(v) => {
                    setValue("companyId", v, { shouldValidate: true });
                    setValue("departmentId", "");
                    // Keep the primary company out of the "also mapped to" list if it was there.
                    setValue("additionalCompanyIds", (watch("additionalCompanyIds") ?? []).filter((id) => id !== v));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select company" />
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
              <div className="flex flex-col gap-1.5">
                <Label>Department</Label>
                <Select
                  value={watch("departmentId")}
                  onValueChange={(v) => setValue("departmentId", v, { shouldValidate: true })}
                  disabled={!companyId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Also mapped to (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Other companies this employee can be assigned tasks under, in addition to their primary company above.
              </p>
              <div className="flex flex-col gap-1.5 rounded-md border p-2.5">
                {(companies ?? []).filter((c) => c.id !== companyId).length === 0 && (
                  <p className="py-1 text-center text-xs text-muted-foreground">
                    {companyId ? "No other companies to map." : "Select a primary company first."}
                  </p>
                )}
                {(companies ?? [])
                  .filter((c) => c.id !== companyId)
                  .map((c) => {
                    const selected = watch("additionalCompanyIds") ?? [];
                    const checked = selected.includes(c.id);
                    return (
                      <div key={c.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`additional-company-${c.id}`}
                          checked={checked}
                          onCheckedChange={(v) =>
                            setValue(
                              "additionalCompanyIds",
                              v ? [...selected, c.id] : selected.filter((id) => id !== c.id),
                            )
                          }
                        />
                        <Label htmlFor={`additional-company-${c.id}`} className="cursor-pointer text-sm font-normal">
                          {c.name}
                        </Label>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Manager (optional)</Label>
                <Select
                  value={watch("managerId") ?? "none"}
                  onValueChange={(v) => setValue("managerId", v === "none" ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No manager</SelectItem>
                    {managerOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as EmployeeInput["status"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "ACTIVE" ? "Active" : "Inactive"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border px-3 py-2.5">
              <Checkbox
                id="canViewExpenses"
                checked={watch("canViewExpenses")}
                onCheckedChange={(v) => setValue("canViewExpenses", v === true)}
              />
              <Label htmlFor="canViewExpenses" className="cursor-pointer text-sm font-normal">
                Can access Monthly Expenses tab
                <span className="ml-1 text-xs text-muted-foreground">(full access — add, edit, mark paid, delete)</span>
              </Label>
            </div>

            <div className="flex items-center gap-2 rounded-md border px-3 py-2.5">
              <Checkbox
                id="canViewUnbilledEntries"
                checked={watch("canViewUnbilledEntries")}
                onCheckedChange={(v) => setValue("canViewUnbilledEntries", v === true)}
              />
              <Label htmlFor="canViewUnbilledEntries" className="cursor-pointer text-sm font-normal">
                Can access Monthly Unbilled Entries tab
                <span className="ml-1 text-xs text-muted-foreground">(full access — add, edit, mark done, delete)</span>
              </Label>
            </div>

            {!isEdit && (
              <div className="flex flex-col gap-2 rounded-md border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="createLogin"
                    checked={watch("createLogin")}
                    onCheckedChange={(v) => setValue("createLogin", v === true)}
                  />
                  <Label htmlFor="createLogin" className="cursor-pointer text-sm font-normal">
                    Create a login for this employee
                  </Label>
                </div>
              </div>
            )}
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
