import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";

export const taskBaseSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  assignedToId: z.string().min(1, "Assignee is required"),
  departmentId: z.string().min(1, "Department is required"),
  companyId: z.string().min(1, "Company is required"),
  categoryId: z.string().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  assignedDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  completedDate: z.coerce.date().optional().nullable(),
  progressPercent: z.coerce.number().int().min(0).max(100),
  estimatedHours: z.coerce.number().min(0).max(1000).optional().nullable(),
  actualHours: z.coerce.number().min(0).max(1000).optional().nullable(),
  remarks: z.string().trim().max(2000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1)).max(10).optional(),
});

export const taskCreateSchema = taskBaseSchema.omit({ status: true, progressPercent: true }).extend({
  status: z.enum(TASK_STATUSES).optional(),
  progressPercent: z.coerce.number().int().min(0).max(100).optional(),
});

export const taskUpdateSchema = taskBaseSchema.partial();

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

export const bulkUpdateSchema = z.object({
  taskIds: z.array(z.number().int()).min(1, "Select at least one task"),
  patch: z.object({
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    assignedToId: z.string().optional(),
  }),
});
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;

export const bulkDeleteSchema = z.object({
  taskIds: z.array(z.number().int()).min(1, "Select at least one task"),
});
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
