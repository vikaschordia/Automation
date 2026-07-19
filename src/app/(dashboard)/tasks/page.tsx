"use client";

import { useState } from "react";
import { Plus, Download } from "lucide-react";
import type { SortingState } from "@tanstack/react-table";
import { useSession } from "@/components/layout/session-provider";
import { useTasks, useDeleteTask, buildTaskQuery, type TaskFilters as TaskFiltersState, type TaskRow } from "@/hooks/use-tasks";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { BulkActionBar } from "@/components/tasks/bulk-action-bar";
import { Button } from "@/components/ui/button";

export default function TasksPage() {
  const { role } = useSession();
  const [filters, setFilters] = useState<TaskFiltersState>({ page: 1, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([{ id: "dueDate", desc: false }]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const { data, isLoading, isPlaceholderData } = useTasks({
    ...filters,
    sortBy: sorting[0]?.id,
    sortDir: sorting[0]?.desc ? "desc" : "asc",
  });
  const deleteMutation = useDeleteTask();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState<TaskRow | null>(null);

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]).map(Number);

  return (
    <div>
      <PageHeader
        title={role === "ADMIN" ? "All Tasks" : "My Tasks"}
        description="Spreadsheet view — sort, filter, resize columns and edit inline."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a
                href={`/api/tasks/export?${buildTaskQuery({
                  ...filters,
                  sortBy: sorting[0]?.id,
                  sortDir: sorting[0]?.desc ? "desc" : "asc",
                })}`}
              >
                <Download className="size-4" /> Export
              </a>
            </Button>
            {role === "ADMIN" && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> Assign task
              </Button>
            )}
          </div>
        }
      />

      <TaskFilters role={role} filters={filters} onChange={setFilters} />

      {role === "ADMIN" && <BulkActionBar taskIds={selectedIds} onClear={() => setRowSelection({})} />}

      <div className={isPlaceholderData ? "opacity-60 transition-opacity" : ""}>
        <TaskTable
          tasks={data?.tasks ?? []}
          role={role}
          isLoading={isLoading}
          sorting={sorting}
          onSortingChange={setSorting}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onEdit={(task) => {
            setEditing(task);
            setFormOpen(true);
          }}
          onDelete={setDeleting}
        />
      </div>

      {data && (
        <PaginationBar
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={data.pageSize}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          onPageSizeChange={(pageSize) => setFilters((f) => ({ ...f, pageSize, page: 1 }))}
        />
      )}

      {role === "ADMIN" && (
        <>
          <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editing} />
          <ConfirmDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={`Delete ${deleting?.taskNumber}?`}
            description="This moves the task to the deleted list. This can't be undone from the UI yet."
            confirmLabel="Delete"
            loading={deleteMutation.isPending}
            onConfirm={async () => {
              if (!deleting) return;
              await deleteMutation.mutateAsync(deleting.id);
              setDeleting(null);
            }}
          />
        </>
      )}
    </div>
  );
}
