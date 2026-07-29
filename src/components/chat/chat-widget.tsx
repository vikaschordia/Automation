"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Minus, X, Send, GripHorizontal } from "lucide-react";
import { useChatRecipients, useChatMessages, useChatUnread, useSendChatMessage, useMarkChatRead, type ChatMessageRow } from "@/hooks/use-chat";
import { useSession } from "@/components/layout/session-provider";
import { useMounted } from "@/hooks/use-mounted";
import { formatRelative } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "chat-widget-ui";
const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 420;
const MAX_MENTION_RESULTS = 6;

type PanelState = "open" | "minimized" | "closed";
interface WidgetUi {
  panel: PanelState;
  x: number | null;
  y: number | null;
}

function loadUi(): WidgetUi {
  if (typeof window === "undefined") return { panel: "closed", x: null, y: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { panel: "closed", x: null, y: null };
    const parsed = JSON.parse(raw);
    return {
      panel: parsed.panel === "open" || parsed.panel === "minimized" ? parsed.panel : "closed",
      x: typeof parsed.x === "number" ? parsed.x : null,
      y: typeof parsed.y === "number" ? parsed.y : null,
    };
  } catch {
    return { panel: "closed", x: null, y: null };
  }
}

function saveUi(ui: WidgetUi) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ui));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Best-effort @mention highlighting: bolds "@Name" for every name we know was mentioned in this
 *  message, looked up from the current recipients list (not stored per-message). */
function MessageBody({ message, namesById }: { message: ChatMessageRow; namesById: Map<string, string> }) {
  const mentionedNames = message.mentionedUserIds.map((id) => namesById.get(id)).filter((n): n is string => !!n);
  if (mentionedNames.length === 0) return <>{message.body}</>;

  const pattern = new RegExp(`(@(?:${mentionedNames.map(escapeRegExp).join("|")}))`, "g");
  const parts = message.body.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        mentionedNames.some((n) => `@${n}` === part) ? (
          <span key={i} className="font-semibold text-primary">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** Finds the "@query" fragment ending at the cursor, if the caret is currently inside one — e.g.
 *  "hey @vik" with the cursor at the end returns "vik". Returns null if the caret isn't in one. */
function activeMentionQuery(text: string, cursorPos: number): { query: string; atIndex: number } | null {
  const uptoCursor = text.slice(0, cursorPos);
  const atIndex = uptoCursor.lastIndexOf("@");
  if (atIndex === -1) return null;
  const fragment = uptoCursor.slice(atIndex + 1);
  if (/\s/.test(fragment)) return null;
  return { query: fragment, atIndex };
}

export function ChatWidget() {
  const mounted = useMounted();
  const { userId } = useSession();
  const [ui, setUi] = useState<WidgetUi>({ panel: "closed", x: null, y: null });
  const [uiLoaded, setUiLoaded] = useState(false);
  if (mounted && !uiLoaded) {
    setUiLoaded(true);
    setUi(loadUi());
  }

  const { data: recipientsData } = useChatRecipients();
  const recipients = useMemo(() => recipientsData?.recipients ?? [], [recipientsData]);
  const namesById = useMemo(() => new Map(recipients.map((r) => [r.id, r.name])), [recipients]);

  const { data: messagesData } = useChatMessages({ enabled: ui.panel === "open" });
  const messages = messagesData?.messages ?? [];
  const { data: unread } = useChatUnread();
  const sendMutation = useSendChatMessage();
  const markReadMutation = useMarkChatRead();

  const [lastHandledMentionId, setLastHandledMentionId] = useState<string | null>(null);
  const latestMentionId = unread?.latestMentionMessageId ?? null;
  // Force the panel open exactly once per new unread @mention (not on every poll tick) — mirrors
  // NotesWidget's render-time state-correction pattern instead of a useEffect.
  if (uiLoaded && latestMentionId && latestMentionId !== lastHandledMentionId && ui.panel !== "open") {
    setLastHandledMentionId(latestMentionId);
    const next = { ...ui, panel: "open" as const };
    setUi(next);
    saveUi(next);
  }

  // Opening the panel (auto or manual) marks the conversation read — an actual side effect, so
  // unlike the state-correction above this belongs in an effect, not render.
  useEffect(() => {
    if (ui.panel === "open") markReadMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.panel]);

  // Lets the notification bell (notification-bell.tsx) open this widget for a chat-mention item,
  // without needing a shared store — this floating widget has no route of its own to navigate to.
  useEffect(() => {
    function handleOpenTeamChat() {
      updateUi({ panel: "open" });
    }
    window.addEventListener("open-team-chat", handleOpenTeamChat);
    return () => window.removeEventListener("open-team-chat", handleOpenTeamChat);
  }, []);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ui.panel === "open" && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, ui.panel]);

  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [text, setText] = useState("");
  const [pendingMentions, setPendingMentions] = useState<Map<string, string>>(new Map());
  const [mentionQuery, setMentionQuery] = useState<{ query: string; atIndex: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateUi(patch: Partial<WidgetUi>) {
    setUi((prev) => {
      const next = { ...prev, ...patch };
      saveUi(next);
      return next;
    });
  }

  function onDragStart(e: React.PointerEvent) {
    const rect = (e.currentTarget.closest("[data-chat-panel]") as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onDragMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const { startX, startY, origX, origY } = dragState.current;
    const width = ui.panel === "minimized" ? 220 : PANEL_WIDTH;
    const height = ui.panel === "minimized" ? 44 : PANEL_HEIGHT;
    const x = Math.min(Math.max(0, origX + (e.clientX - startX)), window.innerWidth - width);
    const y = Math.min(Math.max(0, origY + (e.clientY - startY)), window.innerHeight - height);
    updateUi({ x, y });
  }

  function onDragEnd() {
    dragState.current = null;
  }

  const mentionResults = useMemo(() => {
    if (!mentionQuery) return [];
    const q = mentionQuery.query.toLowerCase();
    return recipients
      .filter((r) => r.id !== userId && r.name.toLowerCase().includes(q))
      .slice(0, MAX_MENTION_RESULTS);
  }, [mentionQuery, recipients, userId]);

  function handleTextChange(value: string, cursorPos: number) {
    setText(value);
    setMentionQuery(activeMentionQuery(value, cursorPos));
  }

  function pickMention(recipientId: string, recipientName: string) {
    if (!mentionQuery) return;
    const before = text.slice(0, mentionQuery.atIndex);
    const after = text.slice(mentionQuery.atIndex + 1 + mentionQuery.query.length);
    const inserted = `@${recipientName} `;
    setText(before + inserted + after);
    setPendingMentions((prev) => new Map(prev).set(recipientId, recipientName));
    setMentionQuery(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function send() {
    const body = text.trim();
    if (!body) return;
    sendMutation.mutate(
      { body, mentionedUserIds: Array.from(pendingMentions.keys()) },
      {
        onSuccess: () => {
          setText("");
          setPendingMentions(new Map());
        },
      },
    );
  }

  if (!mounted) return null;

  if (ui.panel === "closed") {
    return (
      <button
        type="button"
        onClick={() => updateUi({ panel: "open" })}
        className="fixed right-6 bottom-24 z-50 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
        title="Open team chat"
      >
        <MessageCircle className="size-5" />
        {unread?.hasUnreadMention && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unread.unreadMentionCount > 9 ? "9+" : unread.unreadMentionCount}
          </span>
        )}
      </button>
    );
  }

  const style: React.CSSProperties =
    ui.x !== null && ui.y !== null
      ? { left: ui.x, top: ui.y, right: "auto", bottom: "auto" }
      : { right: 24, bottom: 88 };

  return (
    <div
      data-chat-panel
      className="fixed z-50 flex flex-col overflow-hidden rounded-lg border bg-card shadow-xl"
      style={{ width: ui.panel === "minimized" ? 220 : PANEL_WIDTH, ...style }}
    >
      <div
        className="flex cursor-grab touch-none items-center gap-1.5 border-b bg-muted/60 px-2.5 py-2 active:cursor-grabbing"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
      >
        <GripHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
        <MessageCircle className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-xs font-semibold">Team Chat</span>
        <button
          type="button"
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title={ui.panel === "minimized" ? "Restore" : "Minimize"}
          onClick={() => updateUi({ panel: ui.panel === "minimized" ? "open" : "minimized" })}
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
          title="Close"
          onClick={() => updateUi({ panel: "closed" })}
        >
          <X className="size-3.5" />
        </button>
      </div>

      {ui.panel === "open" && (
        <>
          <div ref={listRef} className="flex max-h-80 flex-col gap-2 overflow-y-auto p-2.5">
            {messages.length === 0 && (
              <p className="px-1.5 py-6 text-center text-xs text-muted-foreground">
                No messages yet. Say hello, or @mention someone to get their attention.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col rounded-md px-2 py-1.5", m.senderId === userId ? "bg-primary/10" : "bg-muted/60")}>
                <div className="mb-0.5 flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold">{m.senderName}</span>
                  <span className="text-[10px] text-muted-foreground">{m.senderRole === "ADMIN" ? "admin" : "employee"}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{formatRelative(m.createdAt)}</span>
                </div>
                <p className="text-sm break-words">
                  <MessageBody message={m} namesById={namesById} />
                </p>
              </div>
            ))}
          </div>
          <div className="relative border-t p-2">
            {mentionQuery && mentionResults.length > 0 && (
              <div className="absolute bottom-full left-2 mb-1 flex max-h-40 w-56 flex-col overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                {mentionResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => pickMention(r.id, r.name)}
                  >
                    {r.name} <span className="text-xs text-muted-foreground">({r.role === "ADMIN" ? "admin" : "employee"})</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                onKeyUp={(e) => handleTextChange(e.currentTarget.value, e.currentTarget.selectionStart ?? e.currentTarget.value.length)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !mentionQuery) send();
                }}
                placeholder="Message, @mention to notify..."
                className="h-8 text-sm"
                maxLength={500}
              />
              <button
                type="button"
                onClick={send}
                disabled={!text.trim() || sendMutation.isPending}
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
