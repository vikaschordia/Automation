"use client";

import { Search, X, Filter } from "lucide-react";
import { useCompanies } from "@/hooks/use-companies";
import { useDepartments } from "@/hooks/use-departments";
import { useEmployees } from "@/hooks/use-employees";
import { useTaskCategories } from "@/hooks/use-tasks";
import { TASK_PRIORITIES, TASK_STATUSES, PRIORITY_META, STATUS_META, type Role } from "@/lib/constants";
import type { TaskFilters as TaskFiltersState } from "@/hooks/use-tasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BUCKET_LABELS: Record<string, string> = {
  overdue: "Overdue",
  dueToday: "Due Today",
  dueTomorrow: "Due Tomorrow",
  highPriorityOpen: "High Priority (open)",
};

export function TaskFilters({
  role,
  filters,
  onChange,
}: {
  role: Role;
  filters: TaskFiltersState;
  onChange: (filters: TaskFiltersState) => void;
}) {
  const { data: companies } = useCompanies({ enabled: role === "ADMIN" });
  const { data: departments } = useDepartments(filters.companyId, { enabled: role === "ADMIN" });
  const { data: employees } = useEmployees(
    { companyId: filters.companyId, departmentId: filters.departmentId },
    { enabled: role === "ADMIN" },
  );
  const { data: categories } = useTaskCategories();

  const hasActiveFilters = !!(
    filters.search ||
    filters.status ||
    filters.priority ||
    filters.companyId ||
    filters.departmentId ||
    filters.assignedToId ||
    filters.categoryId ||
    filters.bucket
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {filters.bucket && (
        <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Filter className="size-3" />
          {BUCKET_LABELS[filters.bucket] ?? filters.bucket}
          <button
            type="button"
            aria-label="Remove filter"
            className="rounded-full hover:bg-primary/20"
            onClick={() => onChange({ ...filters, bucket: undefined, page: 1 })}
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
          className="w-56 pl-8"
        />
      </div>

      <Select value={filters.status ?? "all"} onValueChange={(v) => onChange({ ...filters, status: v === "all" ? undefined : v, page: 1 })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_META[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.priority ?? "all"} onValueChange={(v) => onChange({ ...filters, priority: v === "all" ? undefined : v, page: 1 })}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {TASK_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_META[p].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {role === "ADMIN" && (
        <>
          <Select
            value={filters.companyId ?? "all"}
            onValueChange={(v) => onChange({ ...filters, companyId: v === "all" ? undefined : v, departmentId: undefined, page: 1 })}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.departmentId ?? "all"}
            onValueChange={(v) => onChange({ ...filters, departmentId: v === "all" ? undefined : v, page: 1 })}
            disabled={!filters.companyId}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.assignedToId ?? "all"}
            onValueChange={(v) => onChange({ ...filters, assignedToId: v === "all" ? undefined : v, page: 1 })}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees?.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      <Select value={filters.categoryId ?? "all"} onValueChange={(v) => onChange({ ...filters, categoryId: v === "all" ? undefined : v, page: 1 })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories?.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({ page: 1, pageSize: filters.pageSize })}>
          <X className="size-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}
