import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/delay";
import type { SessionPayload } from "@/lib/auth";

export interface ChatRecipient {
  id: string;
  name: string;
  role: string;
}

/**
 * Every active user across the whole org — deliberately not scoped by company/department, since
 * the chat channel is shared org-wide (any employee/admin can message and @mention any other).
 */
export async function listRecipients(): Promise<ChatRecipient[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, role: true, email: true, employee: { select: { name: true } } },
    orderBy: { email: "asc" },
  });
  return users
    .map((u) => ({ id: u.id, role: u.role, name: u.employee?.name ?? (u.role === "ADMIN" ? "Admin" : u.email) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const MESSAGE_LIMIT = 100;

/**
 * Chat is a same-day scratchpad, not a persistent history — this app has no background scheduler
 * (see ensureRecurringExpenses for the same on-demand pattern), so "cleared once the date changes"
 * means purging anything from a previous day the next time chat is touched, rather than on a timer.
 */
async function purgeOldMessages(): Promise<void> {
  await prisma.chatMessage.deleteMany({ where: { createdAt: { lt: startOfDay(new Date()) } } });
}

/**
 * Only messages the caller sent or was @mentioned in are visible to them — this is a set of
 * tag-directed conversations, not a public broadcast channel, so e.g. a message from Ankit to
 * @Admin must never show up for Devyani.
 */
export async function listMessages(userId: string) {
  await purgeOldMessages();
  const messages = await prisma.chatMessage.findMany({
    where: { OR: [{ senderId: userId }, { mentionedUserIds: { has: userId } }] },
    orderBy: { createdAt: "desc" },
    take: MESSAGE_LIMIT,
  });
  return messages.reverse();
}

/**
 * mentionedUserIds comes from the composer's explicit @mention picker, not parsed out of the body
 * text afterward — but it's still re-validated here against the real recipient list so a client
 * can't fabricate a mention for someone who doesn't exist / has been deactivated since.
 */
export async function createMessage(session: SessionPayload, body: string, mentionedUserIds: string[]) {
  const recipients = await listRecipients();
  const validIds = new Set(recipients.map((r) => r.id));
  const filteredMentions = mentionedUserIds.filter((id) => validIds.has(id));

  return prisma.chatMessage.create({
    data: {
      senderId: session.sub,
      senderName: session.name,
      senderRole: session.role,
      body,
      mentionedUserIds: filteredMentions,
    },
  });
}

export interface UnreadMentionInfo {
  hasUnreadMention: boolean;
  unreadMentionCount: number;
  latestMentionMessageId: string | null;
}

export async function getUnreadMentionInfo(userId: string): Promise<UnreadMentionInfo> {
  await purgeOldMessages();
  const read = await prisma.chatRead.findUnique({ where: { userId } });
  const since = read?.lastReadAt ?? new Date(0);

  const unread = await prisma.chatMessage.findMany({
    where: { createdAt: { gt: since }, mentionedUserIds: { has: userId } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return {
    hasUnreadMention: unread.length > 0,
    unreadMentionCount: unread.length,
    latestMentionMessageId: unread[0]?.id ?? null,
  };
}

export async function markRead(userId: string): Promise<void> {
  await prisma.chatRead.upsert({
    where: { userId },
    create: { userId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}
