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
import { MultiSelect } from "@/components/shared/multi-select";

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
    filters.status?.length ||
    filters.priority?.length ||
    filters.companyId?.length ||
    filters.departmentId?.length ||
    filters.assignedToId?.length ||
    filters.categoryId?.length ||
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

      <MultiSelect
        value={filters.status ?? []}
        onValueChange={(v) => onChange({ ...filters, status: v.length ? v : undefined, page: 1 })}
        options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
        placeholder="All statuses"
        className="w-40"
      />

      <MultiSelect
        value={filters.priority ?? []}
        onValueChange={(v) => onChange({ ...filters, priority: v.length ? v : undefined, page: 1 })}
        options={TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
        placeholder="All priorities"
        className="w-36"
      />

      {role === "ADMIN" && (
        <>
          <MultiSelect
            value={filters.companyId ?? []}
            onValueChange={(v) => onChange({ ...filters, companyId: v.length ? v : undefined, departmentId: undefined, page: 1 })}
            options={companies?.map((c) => ({ value: c.id, label: c.name })) ?? []}
            placeholder="All companies"
            className="w-44"
          />

          <MultiSelect
            value={filters.departmentId ?? []}
            onValueChange={(v) => onChange({ ...filters, departmentId: v.length ? v : undefined, page: 1 })}
            options={departments?.map((d) => ({ value: d.id, label: d.name })) ?? []}
            placeholder="All departments"
            className="w-44"
            disabled={!filters.companyId?.length}
          />

          <MultiSelect
            value={filters.assignedToId ?? []}
            onValueChange={(v) => onChange({ ...filters, assignedToId: v.length ? v : undefined, page: 1 })}
            options={employees?.map((e) => ({ value: e.id, label: e.name })) ?? []}
            placeholder="All employees"
            className="w-44"
          />
        </>
      )}

      <MultiSelect
        value={filters.categoryId ?? []}
        onValueChange={(v) => onChange({ ...filters, categoryId: v.length ? v : undefined, page: 1 })}
        options={categories?.map((c) => ({ value: c.id, label: c.name })) ?? []}
        placeholder="All categories"
        className="w-40"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({ page: 1, pageSize: filters.pageSize })}>
          <X className="size-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}
