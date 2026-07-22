import { z } from "zod";

export const noteCreateSchema = z.object({
  content: z.string().trim().min(1, "Note can't be empty").max(300),
});

export const noteUpdateSchema = z.object({
  content: z.string().trim().min(1, "Note can't be empty").max(300).optional(),
  done: z.boolean().optional(),
  order: z.number().int().optional(),
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;
