import { z } from "zod";

export const companySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Code must be at least 2 characters")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Code may only contain letters, numbers, hyphens and underscores"),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;
