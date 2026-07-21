"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface SimpleSort {
  by: string;
  dir: "asc" | "desc";
}

/** Toggles a simple { by, dir } sort state the way clicking a spreadsheet column header does. */
export function toggleSort(current: SimpleSort, key: string): SimpleSort {
  if (current.by !== key) return { by: key, dir: "asc" };
  return { by: key, dir: current.dir === "asc" ? "desc" : "asc" };
}

/**
 * Clickable, sort-aware column header for the plain (non-TanStack) tables on the Reports page.
 * Mirrors the arrow-icon convention already used by the spreadsheet's TaskTable headers.
 */
export function SortableTableHead({
  sortKey,
  current,
  onSort,
  className,
  align,
  disabledReason,
  children,
}: {
  sortKey: string;
  current: SimpleSort;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "center" | "right";
  disabledReason?: string;
  children: React.ReactNode;
}) {
  if (disabledReason) {
    return (
      <TableHead className={className} title={disabledReason}>
        {children}
      </TableHead>
    );
  }

  const active = current.by === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-1 hover:text-foreground",
          align === "center" && "justify-center",
          align === "right" && "justify-end",
        )}
        onClick={() => onSort(sortKey)}
      >
        {children}
        {active ? (
          current.dir === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />
        ) : (
          <ArrowUpDown className="size-3 opacity-30" />
        )}
      </button>
    </TableHead>
  );
}
