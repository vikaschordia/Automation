import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface NotificationRow {
  id: string;
  type: "TASK_ASSIGNED" | "CHAT_MENTION";
  title: string;
  body: string;
  link: string;
  createdAt: string;
  unread: boolean;
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

const POLL_INTERVAL_MS = 15000;

/** Always mounted (like useChatUnread) so the bell's badge updates even while its dropdown is closed. */
export function useNotifications() {
  return useQuery<{ items: NotificationRow[]; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: async () => jsonOrThrow(await fetch("/api/notifications")),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => jsonOrThrow(await fetch("/api/notifications/read", { method: "POST" })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
