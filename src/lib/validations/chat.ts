import { z } from "zod";

export const chatMessageCreateSchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty").max(500, "Message is too long (max 500 characters)"),
  mentionedUserIds: z.array(z.string()).max(20).optional(),
});

export type ChatMessageCreateInput = z.infer<typeof chatMessageCreateSchema>;
