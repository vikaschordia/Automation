import { prisma } from "@/lib/prisma";
import { markRead as markChatRead } from "@/lib/services/chat-service";
import { formatTaskNumber } from "@/lib/task-number";
import type { SessionPayload } from "@/lib/auth";

export interface NotificationItem {
  id: string;
  type: "TASK_ASSIGNED" | "CHAT_MENTION";
  title: string;
  body: string;
  link: string;
  createdAt: Date;
  unread: boolean;
}

const ITEM_LIMIT = 10;
const TOTAL_LIMIT = 20;

/**
 * Derives "unread" from a single per-user last-read timestamp (mirrors ChatRead/
 * getUnreadMentionInfo in chat-service.ts) instead of a persisted notification log — task
 * assignments and chat @mentions already have queryable timestamps, so there's nothing to write
 * on task creation or message send, and nothing to grow/clean up over time.
 */
export async function getNotifications(session: SessionPayload): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const [taskRead, chatRead] = await Promise.all([
    prisma.taskAssignmentRead.findUnique({ where: { userId: session.sub } }),
    prisma.chatRead.findUnique({ where: { userId: session.sub } }),
  ]);
  const taskSince = taskRead?.lastReadAt ?? new Date(0);
  const chatSince = chatRead?.lastReadAt ?? new Date(0);

  // Admins have no linked Employee, so they never get task-assignment items — only the employee
  // a task is assigned to is notified about it (see getNotifications callers / plan).
  const tasks = session.employeeId
    ? await prisma.task.findMany({
        where: { assignedToId: session.employeeId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: ITEM_LIMIT,
        select: { id: true, taskNumber: true, title: true, createdAt: true },
      })
    : [];

  const mentions = await prisma.chatMessage.findMany({
    where: { mentionedUserIds: { has: session.sub } },
    orderBy: { createdAt: "desc" },
    take: ITEM_LIMIT,
    select: { id: true, body: true, senderName: true, createdAt: true },
  });

  const taskItems: NotificationItem[] = tasks.map((t) => ({
    id: `task-${t.id}`,
    type: "TASK_ASSIGNED",
    title: "New task assigned",
    body: `${formatTaskNumber(t.taskNumber)} — ${t.title}`,
    link: `/tasks/${t.id}`,
    createdAt: t.createdAt,
    unread: t.createdAt > taskSince,
  }));

  const mentionItems: NotificationItem[] = mentions.map((m) => ({
    id: `mention-${m.id}`,
    type: "CHAT_MENTION",
    title: `${m.senderName} mentioned you`,
    body: m.body,
    link: "chat",
    createdAt: m.createdAt,
    unread: m.createdAt > chatSince,
  }));

  const items = [...taskItems, ...mentionItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, TOTAL_LIMIT);
  const unreadCount = items.filter((i) => i.unread).length;

  return { items, unreadCount };
}

export async function markNotificationsRead(session: SessionPayload): Promise<void> {
  const now = new Date();
  await Promise.all([
    prisma.taskAssignmentRead.upsert({
      where: { userId: session.sub },
      create: { userId: session.sub, lastReadAt: now },
      update: { lastReadAt: now },
    }),
    markChatRead(session.sub),
  ]);
}
