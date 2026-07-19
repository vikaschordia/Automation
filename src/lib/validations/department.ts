import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  companyId: z.string().min(1, "Company is required"),
  isActive: z.boolean().optional(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
