import { z } from "zod";

export const taskCategorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
});

export type TaskCategoryInput = z.infer<typeof taskCategorySchema>;
