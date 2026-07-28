"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import type { EmployeePerformanceRow } from "@/hooks/use-reports";
import { ResizableTh } from "@/components/shared/resizable-table-head";
import { Skeleton } from "@/components/ui/skeleton";
import type { SimpleSort } from "@/components/shared/sortable-table-head";

const columnHelper = createColumnHelper<EmployeePerformanceRow>();

const columns = [
  columnHelper.accessor("name", {
    header: "Employee",
    size: 220,
    cell: (info) => (
      <div>
        <div className="font-medium leading-tight">{info.getValue()}</div>
        <div className="text-xs text-muted-foreground">
          {info.row.original.designation} · {info.row.original.department}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("total", { header: "Total", size: 90 }),
  columnHelper.accessor("completed", { header: "Completed", size: 100 }),
  columnHelper.accessor("pending", { header: "Pending", size: 90 }),
  columnHelper.accessor("delayed", {
    header: "Delayed",
    size: 90,
    cell: (info) => (info.getValue() > 0 ? <span className="font-medium text-red-600">{info.getValue()}</span> : 0),
  }),
  columnHelper.accessor("avgDelayDays", { header: "Avg Delay", size: 100, cell: (info) => `${info.getValue()}d` }),
  columnHelper.accessor("avgCompletionDays", { header: "Avg Completion", size: 120, cell: (info) => `${info.getValue()}d` }),
  columnHelper.accessor("completionPercent", {
    header: "Completion %",
    size: 120,
    cell: (info) => (
      <span className={info.getValue() >= 75 ? "font-medium text-emerald-600" : ""}>{info.getValue()}%</span>
    ),
  }),
];

const CENTERED_COLUMN_IDS = ["total", "completed", "pending", "delayed", "avgDelayDays", "avgCompletionDays", "completionPercent"];

export function EmployeePerformanceTable({
  rows,
  isLoading,
  sort,
  onSort,
}: {
  rows: EmployeePerformanceRow[];
  isLoading: boolean;
  sort: SimpleSort;
  onSort: (key: string) => void;
}) {
  const [columnSizing, setColumnSizing] = useState({});
  const data = useMemo(() => rows, [rows]);

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
                const centered = CENTERED_COLUMN_IDS.includes(header.column.id);
                return (
                  <ResizableTh
                    key={header.id}
                    header={header}
                    align={centered ? "center" : undefined}
                    className={centered ? "text-center" : undefined}
                    sortable
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
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td colSpan={columns.length} className="h-11 px-3">
                  <Skeleton className="h-5 w-full" />
                </td>
              </tr>
            ))}
          {!isLoading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                No active employees match this filter.
              </td>
            </tr>
          )}
          {!isLoading &&
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b">
                {row.getVisibleCells().map((cell) => {
                  const centered = CENTERED_COLUMN_IDS.includes(cell.column.id);
                  return (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className={`h-11 px-3 align-middle ${centered ? "text-center" : ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
