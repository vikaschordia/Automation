import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ChatRecipientRow {
  id: string;
  name: string;
  role: string;
}

export interface ChatMessageRow {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  mentionedUserIds: string[];
  createdAt: string;
}

export interface ChatUnreadInfo {
  hasUnreadMention: boolean;
  unreadMentionCount: number;
  latestMentionMessageId: string | null;
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

const POLL_INTERVAL_MS = 12000;

/** Every active user, org-wide — used to populate the @mention picker. Rarely changes, so this
 *  polls far less aggressively than messages/unread. */
export function useChatRecipients() {
  return useQuery<{ recipients: ChatRecipientRow[] }>({
    queryKey: ["chat-recipients"],
    queryFn: async () => jsonOrThrow(await fetch("/api/chat/recipients")),
    staleTime: 5 * 60 * 1000,
  });
}

export function useChatMessages(options?: { enabled?: boolean }) {
  return useQuery<{ messages: ChatMessageRow[] }>({
    queryKey: ["chat-messages"],
    queryFn: async () => jsonOrThrow(await fetch("/api/chat/messages")),
    refetchInterval: POLL_INTERVAL_MS,
    enabled: options?.enabled ?? true,
  });
}

/** Always mounted (regardless of whether the chat panel is open) so a new @mention can trigger
 *  the widget to auto-open even while it's closed/minimized. */
export function useChatUnread() {
  return useQuery<ChatUnreadInfo>({
    queryKey: ["chat-unread"],
    queryFn: async () => jsonOrThrow(await fetch("/api/chat/unread")),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, mentionedUserIds }: { body: string; mentionedUserIds: string[] }) =>
      jsonOrThrow(
        await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, mentionedUserIds }),
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages"] });
      qc.invalidateQueries({ queryKey: ["chat-unread"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkChatRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => jsonOrThrow(await fetch("/api/chat/read", { method: "POST" })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-unread"] }),
  });
}
