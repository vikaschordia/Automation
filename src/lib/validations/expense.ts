import { z } from "zod";
import { EXPENSE_STATUSES } from "@/lib/constants";

export const expenseCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  companyId: z.string().min(1, "Company is required"),
  dueDate: z.coerce.date(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  isRecurring: z.boolean().default(false),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const expenseUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  companyId: z.string().min(1).optional(),
  dueDate: z.coerce.date().optional(),
  amount: z.coerce.number().positive("Amount must be greater than 0").optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  paidDate: z.coerce.date().nullable().optional(),
  isRecurring: z.boolean().optional(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
