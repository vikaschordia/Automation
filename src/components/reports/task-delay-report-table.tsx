"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import type { TaskRow } from "@/hooks/use-tasks";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { ResizableTh } from "@/components/shared/resizable-table-head";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { SimpleSort } from "@/components/shared/sortable-table-head";

const DELAY_SORT_DISABLED_REASON = "Delay is calculated, not stored — sorting by it isn't available yet";

const columnHelper = createColumnHelper<TaskRow>();

const columns = [
  columnHelper.accessor((row) => row.assignedTo.name, { id: "employee", header: "Employee", size: 160 }),
  columnHelper.accessor((row) => row.company.name, { id: "company", header: "Company", size: 140 }),
  columnHelper.accessor("taskNumber", { header: "Task ID", size: 110, cell: (info) => <span className="font-mono text-xs text-primary">{info.getValue()}</span> }),
  columnHelper.accessor("title", {
    header: "Task Name",
    size: 220,
    cell: (info) => (
      <span className="line-clamp-1" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("priority", { header: "Priority", size: 130, cell: (info) => <PriorityBadge priority={info.getValue()} /> }),
  columnHelper.accessor("status", { header: "Status", size: 150, cell: (info) => <StatusBadge status={info.getValue()} /> }),
  columnHelper.accessor("assignedDate", { header: "Assigned Date", size: 120, cell: (info) => formatDate(info.getValue()) }),
  columnHelper.accessor("dueDate", { header: "Due Date", size: 120, cell: (info) => formatDate(info.getValue()) }),
  columnHelper.accessor("completedDate", { header: "Completed Date", size: 130, cell: (info) => formatDate(info.getValue()) }),
  columnHelper.accessor("delayDays", {
    header: "Delay (days)",
    size: 110,
    cell: (info) => {
      const days = info.getValue();
      return days > 0 ? <span className="font-medium text-red-600">{days}</span> : "—";
    },
  }),
  columnHelper.accessor("remarks", {
    header: "Remarks",
    size: 200,
    cell: (info) => (
      <span className="line-clamp-1 text-muted-foreground" title={info.getValue() || undefined}>
        {info.getValue() || "—"}
      </span>
    ),
  }),
];

const SORTABLE_COLUMN_IDS = [
  "employee",
  "company",
  "taskNumber",
  "title",
  "priority",
  "status",
  "assignedDate",
  "dueDate",
  "completedDate",
  "remarks",
];

export function TaskDelayReportTable({
  tasks,
  isLoading,
  sort,
  onSort,
}: {
  tasks: TaskRow[];
  isLoading: boolean;
  sort: SimpleSort;
  onSort: (key: string) => void;
}) {
  const [columnSizing, setColumnSizing] = useState({});
  const data = useMemo(() => tasks, [tasks]);

  const table = useReactTable({
    data,
    columns,
    state: { columnSizing },
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-auto rounded-lg border bg-card">
      <table className="w-full caption-bottom text-sm" style={{ width: table.getTotalSize() }}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b">
              {headerGroup.headers.map((header) => {
                const sortable = SORTABLE_COLUMN_IDS.includes(header.column.id);
                return (
                  <ResizableTh
                    key={header.id}
                    header={header}
                    align={header.column.id === "delayDays" ? "right" : undefined}
                    sortable={sortable}
                    disabledReason={!sortable ? DELAY_SORT_DISABLED_REASON : undefined}
                    sortDir={sort.by === header.column.id ? sort.dir : false}
                    onSort={() => onSort(header.column.id)}
                  />
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td colSpan={columns.length} className="h-11 px-3">
                  <Skeleton className="h-5 w-full" />
                </td>
              </tr>
            ))}
          {!isLoading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                No tasks match this report.
              </td>
            </tr>
          )}
          {!isLoading &&
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={{ width: cell.column.getSize() }} className="h-11 whitespace-nowrap px-3 align-middle">
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
