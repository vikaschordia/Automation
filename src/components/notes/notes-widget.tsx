"use client";

import { useRef, useState } from "react";
import { StickyNote, Minus, X, Plus, GripHorizontal } from "lucide-react";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks/use-notes";
import { useMounted } from "@/hooks/use-mounted";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "notes-widget-ui";
const PANEL_WIDTH = 280;
const PANEL_HEIGHT = 360;

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

/**
 * Personal, per-user scratch-pad — a small floating checklist for quick reminders that isn't
 * part of the task-tracking data model at all (see the Note model's own comment). Mounted once
 * in the dashboard layout so it floats over every page for both roles. Position and open/
 * minimized/closed state live in localStorage (per browser, not synced), while the note content
 * itself is stored per-user in the database so it follows the user between logins/machines.
 */
export function NotesWidget() {
  const mounted = useMounted();
  const [ui, setUi] = useState<WidgetUi>({ panel: "closed", x: null, y: null });
  // Loads the persisted position/panel-state once the client mounts (localStorage doesn't exist
  // during SSR, and reading it up front would cause a hydration mismatch) — done as a render-time
  // state adjustment keyed off `mounted` flipping true, not a useEffect, so there's no extra paint.
  const [uiLoaded, setUiLoaded] = useState(false);
  if (mounted && !uiLoaded) {
    setUiLoaded(true);
    setUi(loadUi());
  }
  const [draft, setDraft] = useState("");
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const { data } = useNotes();
  const notes = data?.notes ?? [];
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  function updateUi(patch: Partial<WidgetUi>) {
    setUi((prev) => {
      const next = { ...prev, ...patch };
      saveUi(next);
      return next;
    });
  }

  function onDragStart(e: React.PointerEvent) {
    const rect = (e.currentTarget.closest("[data-notes-panel]") as HTMLElement)?.getBoundingClientRect();
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

  function addNote() {
    const content = draft.trim();
    if (!content) return;
    createMutation.mutate(content);
    setDraft("");
  }

  if (!mounted) return null;

  if (ui.panel === "closed") {
    return (
      <button
        type="button"
        onClick={() => updateUi({ panel: "open" })}
        className="fixed right-6 bottom-6 z-50 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
        title="Open notes"
      >
        <StickyNote className="size-5" />
      </button>
    );
  }

  const style: React.CSSProperties =
    ui.x !== null && ui.y !== null
      ? { left: ui.x, top: ui.y, right: "auto", bottom: "auto" }
      : { right: 24, bottom: 24 };

  return (
    <div
      data-notes-panel
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
        <StickyNote className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-xs font-semibold">My Notes</span>
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
          <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto p-2">
            {notes.length === 0 && (
              <p className="px-1.5 py-3 text-center text-xs text-muted-foreground">No notes yet. Add one below.</p>
            )}
            {notes.map((note) => (
              <div key={note.id} className="group flex items-start gap-2 rounded px-1.5 py-1 hover:bg-muted/60">
                <Checkbox
                  checked={note.done}
                  onCheckedChange={(v) => updateMutation.mutate({ id: note.id, input: { done: !!v } })}
                  className="mt-0.5 shrink-0"
                />
                <span
                  className={cn(
                    "flex-1 text-sm break-words",
                    note.done && "text-muted-foreground line-through",
                  )}
                >
                  {note.content}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  title="Delete"
                  onClick={() => deleteMutation.mutate(note.id)}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 border-t p-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addNote();
              }}
              placeholder="Add a note..."
              className="h-8 text-sm"
              maxLength={300}
            />
            <button
              type="button"
              onClick={addNote}
              disabled={!draft.trim()}
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
