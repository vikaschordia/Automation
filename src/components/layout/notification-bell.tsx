"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, useMarkNotificationsRead, type NotificationRow } from "@/hooks/use-notifications";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

function openTeamChat() {
  window.dispatchEvent(new Event("open-team-chat"));
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const markReadMutation = useMarkNotificationsRead();
  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline disabled:opacity-50"
              disabled={markReadMutation.isPending}
              onClick={() => markReadMutation.mutate()}
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && <p className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications yet.</p>}
          {items.map((item) => (
            <NotificationItemRow key={item.id} item={item} onNavigate={() => setOpen(false)} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItemRow({ item, onNavigate }: { item: NotificationRow; onNavigate: () => void }) {
  const content = (
    <div className={cn("flex flex-col gap-0.5 border-b px-3 py-2.5 last:border-b-0 hover:bg-accent", item.unread && "bg-accent/50")}>
      <div className="flex items-center gap-1.5">
        {item.unread && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
        <span className="text-xs font-semibold">{item.title}</span>
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{formatRelative(item.createdAt)}</span>
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
    </div>
  );

  if (item.type === "CHAT_MENTION") {
    return (
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => {
          openTeamChat();
          onNavigate();
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={item.link} className="block" onClick={onNavigate}>
      {content}
    </Link>
  );
}
