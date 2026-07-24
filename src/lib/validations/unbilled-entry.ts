import { z } from "zod";
import { UNBILLED_ENTRY_STATUSES } from "@/lib/constants";

export const unbilledEntryCreateSchema = z.object({
  description: z.string().trim().min(2, "Description must be at least 2 characters").max(200),
  expectedDate: z.coerce.date(),
  expectedAmount: z.coerce.number().positive("Amount must be greater than 0"),
  isRecurring: z.boolean().default(false),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const unbilledEntryUpdateSchema = z.object({
  description: z.string().trim().min(2).max(200).optional(),
  expectedDate: z.coerce.date().optional(),
  expectedAmount: z.coerce.number().positive("Amount must be greater than 0").optional(),
  status: z.enum(UNBILLED_ENTRY_STATUSES).optional(),
  entryDoneDate: z.coerce.date().nullable().optional(),
  isRecurring: z.boolean().optional(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export type UnbilledEntryCreateInput = z.infer<typeof unbilledEntryCreateSchema>;
export type UnbilledEntryUpdateInput = z.infer<typeof unbilledEntryUpdateSchema>;
