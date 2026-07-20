"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import { taskCreateSchema, type TaskCreateInput } from "@/lib/validations/task";
import { useCreateTask, useUpdateTask, useTaskCategories, type TaskRow } from "@/hooks/use-tasks";
import { useCompanies } from "@/hooks/use-companies";
import { useDepartments } from "@/hooks/use-departments";
import { useEmployees } from "@/hooks/use-employees";
import { TASK_PRIORITIES, TASK_STATUSES, PRIORITY_META, STATUS_META } from "@/lib/constants";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type TaskFormValues = z.input<typeof taskCreateSchema>;

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultAssignedToId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskRow | null;
  defaultAssignedToId?: string;
}) {
  const isEdit = !!task;
  const { data: companies } = useCompanies();
  const { data: categories } = useTaskCategories();
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const pending = createMutation.isPending || updateMutation.isPending;
  const [tagsText, setTagsText] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskFormValues, unknown, TaskCreateInput>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedToId: defaultAssignedToId ?? "",
      companyId: "",
      departmentId: "",
      categoryId: null,
      priority: "P2_MEDIUM",
      status: "PENDING",
      assignedDate: new Date(),
      dueDate: new Date(),
      estimatedHours: undefined,
      remarks: "",
    },
  });

  const companyId = watch("companyId");
  const { data: departments } = useDepartments(companyId || undefined);
  const { data: employees } = useEmployees(companyId ? { companyId } : undefined);

  useEffect(() => {
    if (!open) return;
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? "",
        assignedToId: task.assignedTo.id,
        companyId: task.company.id,
        departmentId: task.department.id,
        categoryId: task.category?.id ?? null,
        priority: task.priority,
        status: task.status,
        assignedDate: new Date(task.assignedDate),
        dueDate: new Date(task.dueDate),
        estimatedHours: task.estimatedHours ?? undefined,
        remarks: task.remarks ?? "",
      });
      setTagsText(task.tags.join(", "));
    } else {
      reset({
        title: "",
        description: "",
        assignedToId: defaultAssignedToId ?? "",
        companyId: "",
        departmentId: "",
        categoryId: null,
        priority: "P2_MEDIUM",
        status: "PENDING",
        assignedDate: new Date(),
        dueDate: new Date(),
        estimatedHours: undefined,
        remarks: "",
      });
      setTagsText("");
    }
  }, [open, task, defaultAssignedToId, reset]);

  const activeEmployees = useMemo(() => (employees ?? []).filter((e) => e.status === "ACTIVE"), [employees]);

  async function onSubmit(values: TaskCreateInput) {
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = { ...values, tags };
    if (isEdit && task) {
      await updateMutation.mutateAsync({ id: task.id, input: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    if (!createMutation.isError && !updateMutation.isError) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${task?.taskNumber}` : "Assign new task"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update task details." : "Assign a task to an employee with a priority and due date."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form id="task-form" className="flex flex-col gap-4 pb-1" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Task title</Label>
              <Input id="title" placeholder="e.g. Prepare monthly reconciliation" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} placeholder="Detailed description of the task..." {...register("description")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Company</Label>
                <Select
                  value={watch("companyId")}
                  onValueChange={(v) => {
                    setValue("companyId", v, { shouldValidate: true });
                    setValue("departmentId", "");
                    setValue("assignedToId", "");
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
              <Label>Assign to</Label>
              <Select
                value={watch("assignedToId")}
                onValueChange={(v) => setValue("assignedToId", v, { shouldValidate: true })}
                disabled={!companyId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} · {e.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assignedToId && <p className="text-xs text-destructive">{errors.assignedToId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Priority</Label>
                <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as TaskCreateInput["priority"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
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
              <div className="flex flex-col gap-1.5">
                <Label>Category (optional)</Label>
                <Select
                  value={watch("categoryId") ?? "none"}
                  onValueChange={(v) => setValue("categoryId", v === "none" ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isEdit && (
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as TaskCreateInput["status"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
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
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignedDate">Assigned date</Label>
                <Input
                  id="assignedDate"
                  type="date"
                  defaultValue={toDateInputValue(watch("assignedDate") as Date)}
                  onChange={(e) => {
                    // Native date inputs briefly report "" while being typed manually (as
                    // opposed to picked from the calendar, which always lands on a complete
                    // value) — skip those so an Invalid Date never reaches form state.
                    if (!e.target.value) return;
                    setValue("assignedDate", new Date(e.target.value));
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dueDate">Due date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  defaultValue={toDateInputValue(watch("dueDate") as Date)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setValue("dueDate", new Date(e.target.value));
                  }}
                />
                {errors.dueDate && <p className="text-xs text-destructive">Due date is required</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estimatedHours">Est. hours</Label>
                <Input id="estimatedHours" type="number" min={0} step="0.5" {...register("estimatedHours")} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tags">Tags (comma separated, optional)</Label>
              <Input id="tags" placeholder="urgent, client-x" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="remarks">Remarks (optional)</Label>
              <Textarea id="remarks" rows={2} {...register("remarks")} />
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Assign task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
