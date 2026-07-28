"use client";

import { flexRender, type Header } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Drag-to-resize, click-to-sort `<th>` for TanStack-table-backed tables — the single shared
 * implementation of the resize-handle markup originally hand-rolled in task-table.tsx, now reused
 * by the Reports page tables too so there's exactly one resize mechanism in the app, not two.
 */
export function ResizableTh<TData>({
  header,
  sortable,
  sortDir,
  onSort,
  disabledReason,
  sticky,
  align,
  className,
}: {
  header: Header<TData, unknown>;
  sortable?: boolean;
  sortDir?: "asc" | "desc" | false;
  onSort?: () => void;
  disabledReason?: string;
  sticky?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  return (
    <th
      style={{ width: header.getSize() }}
      title={!sortable ? disabledReason : undefined}
      className={cn(
        "relative h-10 select-none whitespace-nowrap px-3 text-left align-middle font-medium text-muted-foreground",
        sticky && "sticky left-0 z-20 bg-muted/95",
        className,
      )}
    >
      {header.isPlaceholder ? null : sortable ? (
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-1 hover:text-foreground",
            align === "center" && "justify-center",
            align === "right" && "justify-end",
          )}
          onClick={onSort}
        >
          {flexRender(header.column.columnDef.header, header.getContext())}
          {sortDir ? (
            sortDir === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />
          ) : (
            <ArrowUpDown className="size-3 opacity-30" />
          )}
        </button>
      ) : (
        <div className={cn("flex items-center gap-1", align === "center" && "justify-center", align === "right" && "justify-end")}>
          {flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      )}
      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none bg-transparent hover:bg-primary/40"
        />
      )}
    </th>
  );
}
