"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2, Loader2, Users } from "lucide-react";
import type { TaskRow } from "@/hooks/use-tasks";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { EditableStatusCell, EditableProgressCell, EditableRemarksCell } from "@/components/tasks/editable-cells";
import { formatDate } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TASK_SORT_FIELDS, type Role } from "@/lib/constants";

const columnHelper = createColumnHelper<TaskRow>();
const SORTABLE_COLUMN_IDS: readonly string[] = TASK_SORT_FIELDS;

export function TaskTable({
  tasks,
  role,
  isLoading,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  onEdit,
  onDelete,
}: {
  tasks: TaskRow[];
  role: Role;
  isLoading: boolean;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: (selection: Record<string, boolean>) => void;
  onEdit: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
}) {
  const [columnSizing, setColumnSizing] = useState({});

  const columns = useMemo(
    () => [
      ...(role === "ADMIN"
        ? [
            columnHelper.display({
              id: "select",
              size: 40,
              header: ({ table }) => (
                <Checkbox
                  checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                  onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                  aria-label="Select all"
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(v) => row.toggleSelected(!!v)}
                  aria-label="Select row"
                  onClick={(e) => e.stopPropagation()}
                />
              ),
            }),
          ]
        : []),
      columnHelper.accessor("taskNumber", {
        header: "Task ID",
        size: 110,
        cell: (info) => (
          <Link href={`/tasks/${info.row.original.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor((row) => row.assignedTo.name, {
        id: "employee",
        header: "Employee",
        size: 150,
        cell: (info) => <span className="truncate" title={info.getValue()}>{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.company.name, {
        id: "company",
        header: "Company",
        size: 130,
      }),
      columnHelper.accessor((row) => row.department.name, {
        id: "department",
        header: "Department",
        size: 130,
      }),
      columnHelper.accessor("title", {
        header: "Task",
        size: 260,
        cell: (info) => (
          <div className="flex min-w-0 items-center gap-1.5">
            <Link href={`/tasks/${info.row.original.id}`} className="line-clamp-1 min-w-0 hover:underline" title={info.getValue()}>
              {info.getValue()}
            </Link>
            {info.row.original.groupId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Users className="size-3.5 shrink-0 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Also assigned to other employees — see Linked Assignments on the task page</TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("priority", {
        header: "Priority",
        size: 130,
        cell: (info) => <PriorityBadge priority={info.getValue()} />,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        size: 170,
        cell: (info) => <EditableStatusCell taskId={info.row.original.id} status={info.getValue()} />,
      }),
      columnHelper.accessor("assignedDate", {
        header: "Assigned Date",
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due Date",
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor("completedDate", {
        header: "Completed Date",
        size: 130,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor("delayDays", {
        header: "Delay",
        size: 90,
        cell: (info) => {
          const days = info.getValue();
          return days > 0 ? (
            <span className="font-medium text-red-600 dark:text-red-400">{days}d</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      }),
      columnHelper.accessor("progressPercent", {
        header: "Progress",
        size: 150,
        cell: (info) => <EditableProgressCell taskId={info.row.original.id} progress={info.getValue()} />,
      }),
      columnHelper.accessor("remarks", {
        header: "Remarks",
        size: 220,
        cell: (info) => <EditableRemarksCell taskId={info.row.original.id} remarks={info.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        size: role === "ADMIN" ? 90 : 50,
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(row.original)}>
              <Pencil className="size-3.5" />
            </Button>
            {role === "ADMIN" && (
              <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => onDelete(row.original)}>
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ),
      }),
    ],
    [role, onEdit, onDelete],
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, rowSelection, columnSizing },
    getRowId: (row) => String(row.id),
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      onRowSelectionChange(next);
    },
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="relative overflow-auto rounded-lg border bg-card">
      <table className="w-full caption-bottom text-sm" style={{ width: table.getTotalSize() }}>
        <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b">
              {headerGroup.headers.map((header, idx) => {
                const sortable = SORTABLE_COLUMN_IDS.includes(header.column.id);
                const sortEntry = sorting.find((s) => s.id === header.column.id);
                return (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn(
                      "relative h-10 select-none whitespace-nowrap px-3 text-left align-middle font-medium text-muted-foreground",
                      idx === 0 && "sticky left-0 z-20 bg-muted/95",
                    )}
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        className="flex cursor-pointer items-center gap-1 hover:text-foreground"
                        onClick={() => {
                          const desc = sortEntry ? !sortEntry.desc : false;
                          onSortingChange([{ id: header.column.id, desc }]);
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortEntry ? sortEntry.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" /> : (
                          <ArrowUpDown className="size-3 opacity-30" />
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">{flexRender(header.column.columnDef.header, header.getContext())}</div>
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
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td colSpan={columns.length} className="h-11 px-3">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                </td>
              </tr>
            ))}
          {!isLoading && tasks.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center text-sm text-muted-foreground">
                No tasks match these filters.
              </td>
            </tr>
          )}
          {!isLoading &&
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={cn("border-b transition-colors hover:bg-muted/40", row.original.isOverdue && "bg-red-50/50 dark:bg-red-950/10")}>
                {row.getVisibleCells().map((cell, idx) => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className={cn("h-11 px-3 align-middle", idx === 0 && "sticky left-0 z-[5] bg-card")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-20">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
