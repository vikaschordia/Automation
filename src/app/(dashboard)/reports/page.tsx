"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Users2, AlarmClockOff } from "lucide-react";
import { useTasks, buildTaskQuery, type TaskFilters as TaskFiltersState } from "@/hooks/use-tasks";
import { useEmployeePerformanceReport } from "@/hooks/use-reports";
import { useCompanies } from "@/hooks/use-companies";
import { useDepartments } from "@/hooks/use-departments";
import { useSession } from "@/components/layout/session-provider";
import { PageHeader } from "@/components/shared/page-header";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskReportTable } from "@/components/reports/task-report-table";
import { TaskDelayReportTable } from "@/components/reports/task-delay-report-table";
import { EmployeePerformanceTable } from "@/components/reports/employee-performance-table";
import { toggleSort, type SimpleSort } from "@/components/shared/sortable-table-head";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiSelect } from "@/components/shared/multi-select";

const DATE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "This year", days: 365 },
] as const;

export default function ReportsPage() {
  const { role } = useSession();
  const isAdmin = role === "ADMIN";
  const [filters, setFilters] = useState<TaskFiltersState>({ page: 1, pageSize: 10 });
  // Newest-due first by default. Without an explicit sort this fell back to the same
  // ascending-due-date order the spreadsheet view uses, which is right for "what's due soon" but
  // wrong for a report preview: it always surfaces the very oldest matching tasks on page 1 —
  // e.g. selecting no filters at all looked like "only completed tasks exist" because ancient,
  // long-since-completed tasks sort first.
  const [taskSort, setTaskSort] = useState<SimpleSort>({ by: "dueDate", dir: "desc" });
  const { data, isLoading } = useTasks({ ...filters, sortBy: taskSort.by, sortDir: taskSort.dir });
  function onTaskSort(key: string) {
    setTaskSort((s) => toggleSort(s, key));
    setFilters((f) => ({ ...f, page: 1 }));
  }

  const [delayFilters, setDelayFilters] = useState<TaskFiltersState>({ page: 1, pageSize: 10 });
  const [delaySort, setDelaySort] = useState<SimpleSort>({ by: "dueDate", dir: "desc" });
  const { data: delayData, isLoading: delayLoading } = useTasks({ ...delayFilters, sortBy: delaySort.by, sortDir: delaySort.dir });
  function onDelaySort(key: string) {
    setDelaySort((s) => toggleSort(s, key));
    setDelayFilters((f) => ({ ...f, page: 1 }));
  }

  function applyDelayPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDelayFilters((f) => ({ ...f, dueFrom: toDateInputValue(from), dueTo: toDateInputValue(to), page: 1 }));
  }

  const [perfCompany, setPerfCompany] = useState<string[]>([]);
  const [perfDept, setPerfDept] = useState<string[]>([]);
  const [perfSort, setPerfSort] = useState<SimpleSort>({ by: "name", dir: "asc" });
  const { data: companies } = useCompanies({ enabled: isAdmin });
  const { data: departments } = useDepartments(perfCompany, { enabled: isAdmin });
  const { data: performanceRows, isLoading: perfLoading } = useEmployeePerformanceReport({
    companyId: perfCompany,
    departmentId: perfDept,
    sortBy: perfSort.by,
    sortDir: perfSort.dir,
  });

  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFilters((f) => ({ ...f, dueFrom: toDateInputValue(from), dueTo: toDateInputValue(to), page: 1 }));
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description={
          isAdmin
            ? "Employee, department, company, priority, status and date-range reports — export any of them to Excel."
            : "Your own task and performance reports — export any of them to Excel."
        }
      />

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1.5">
            <FileSpreadsheet className="size-3.5" /> Task Reports
          </TabsTrigger>
          <TabsTrigger value="delay" className="gap-1.5">
            <AlarmClockOff className="size-3.5" /> Task Delay Report
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <Users2 className="size-3.5" /> Employee Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Quick range:</span>
            {DATE_PRESETS.map((p) => (
              <Button key={p.label} variant="outline" size="sm" onClick={() => applyPreset(p.days)}>
                {p.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setFilters((f) => ({ ...f, dueFrom: undefined, dueTo: undefined }))}>
              Clear range
            </Button>
          </div>

          <TaskFilters role={role} filters={filters} onChange={setFilters} />

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `${data?.total ?? 0} tasks match this report`} — preview shows the first {filters.pageSize}
            </p>
            <Button asChild>
              <a href={`/api/tasks/export?${buildTaskQuery({ ...filters, sortBy: taskSort.by, sortDir: taskSort.dir })}`}>
                <Download className="size-4" /> Export to Excel
              </a>
            </Button>
          </div>

          <TaskReportTable tasks={data?.tasks ?? []} isLoading={isLoading} sort={taskSort} onSort={onTaskSort} />
        </TabsContent>

        <TabsContent value="delay" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Quick range:</span>
            {DATE_PRESETS.map((p) => (
              <Button key={p.label} variant="outline" size="sm" onClick={() => applyDelayPreset(p.days)}>
                {p.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setDelayFilters((f) => ({ ...f, dueFrom: undefined, dueTo: undefined }))}>
              Clear range
            </Button>
          </div>

          <TaskFilters role={role} filters={delayFilters} onChange={setDelayFilters} />

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {delayLoading ? "Loading..." : `${delayData?.total ?? 0} tasks match this report`} — preview shows the first{" "}
              {delayFilters.pageSize}
            </p>
            <Button asChild>
              <a href={`/api/reports/task-delay/export?${buildTaskQuery({ ...delayFilters, sortBy: delaySort.by, sortDir: delaySort.dir })}`}>
                <Download className="size-4" /> Export to Excel
              </a>
            </Button>
          </div>

          <TaskDelayReportTable tasks={delayData?.tasks ?? []} isLoading={delayLoading} sort={delaySort} onSort={onDelaySort} />
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <MultiSelect
                  value={perfCompany}
                  onValueChange={(v) => {
                    setPerfCompany(v);
                    setPerfDept([]);
                  }}
                  options={companies?.map((c) => ({ value: c.id, label: c.name })) ?? []}
                  placeholder="All companies"
                  className="w-48"
                />
                <MultiSelect
                  value={perfDept}
                  onValueChange={setPerfDept}
                  options={departments?.map((d) => ({ value: d.id, label: d.name })) ?? []}
                  placeholder="All departments"
                  className="w-48"
                  disabled={perfCompany.length === 0}
                />
              </>
            )}
            <Button
              asChild
              className="ml-auto"
            >
              <a
                href={`/api/reports/employee-performance/export?${new URLSearchParams({
                  ...(perfCompany.length ? { companyId: perfCompany.join(",") } : {}),
                  ...(perfDept.length ? { departmentId: perfDept.join(",") } : {}),
                  sortBy: perfSort.by,
                  sortDir: perfSort.dir,
                }).toString()}`}
              >
                <Download className="size-4" /> Export to Excel
              </a>
            </Button>
          </div>

          <EmployeePerformanceTable
            rows={performanceRows ?? []}
            isLoading={perfLoading}
            sort={perfSort}
            onSort={(k) => setPerfSort((s) => toggleSort(s, k))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
