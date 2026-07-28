"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { useAuditLogs, type AuditLogFilters } from "@/hooks/use-audit-logs";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, type AuditAction, type AuditEntityType } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelect } from "@/components/shared/multi-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN: "Login",
  LOGIN_FAILED: "Login failed",
  LOGOUT: "Logout",
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  AUTH: "Auth",
  TASK: "Task",
  EXPENSE: "Expense",
  UNBILLED_ENTRY: "Unbilled Entry",
  EMPLOYEE: "Employee",
  COMPANY: "Company",
  DEPARTMENT: "Department",
  CATEGORY: "Category",
};

const ACTION_BADGE_CLASS: Record<AuditAction, string> = {
  LOGIN: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  LOGIN_FAILED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  LOGOUT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  CREATE: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  UPDATE: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  DELETE: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, pageSize: 25 });
  const { data, isLoading } = useAuditLogs(filters);
  const rows = data?.rows ?? [];

  function patch(next: Partial<AuditLogFilters>) {
    setFilters((f) => ({ ...f, ...next, page: 1 }));
  }

  return (
    <div>
      <PageHeader title="Audit Trail" description="Every login and create/update/delete action taken by admins and employees." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search actor or summary..."
          className="w-56"
          value={filters.search ?? ""}
          onChange={(e) => patch({ search: e.target.value || undefined })}
        />
        <Input
          type="date"
          className="w-40"
          value={filters.from ?? ""}
          onChange={(e) => patch({ from: e.target.value || undefined })}
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          className="w-40"
          value={filters.to ?? ""}
          onChange={(e) => patch({ to: e.target.value || undefined })}
        />
        <MultiSelect
          value={filters.entityType ?? []}
          onValueChange={(v) => patch({ entityType: v.length ? (v as AuditEntityType[]) : undefined })}
          options={AUDIT_ENTITY_TYPES.map((t) => ({ value: t, label: ENTITY_LABELS[t] }))}
          placeholder="All entities"
          className="w-44"
        />
        <MultiSelect
          value={filters.action ?? []}
          onValueChange={(v) => patch({ action: v.length ? (v as AuditAction[]) : undefined })}
          options={AUDIT_ACTIONS.map((a) => ({ value: a, label: ACTION_LABELS[a] }))}
          placeholder="All actions"
          className="w-40"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Time</TableHead>
              <TableHead className="w-48">Actor</TableHead>
              <TableHead className="w-32">Action</TableHead>
              <TableHead className="w-36">Entity</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  <History className="mx-auto mb-2 size-8 opacity-40" />
                  No activity matches these filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                <TableCell>
                  <span className="font-medium">{row.userName}</span>
                  {row.userRole && <span className="ml-1.5 text-xs text-muted-foreground">({row.userRole.toLowerCase()})</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={ACTION_BADGE_CLASS[row.action]}>
                    {ACTION_LABELS[row.action]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{ENTITY_LABELS[row.entityType]}</TableCell>
                <TableCell className="text-sm">{row.summary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    </div>
  );
}
