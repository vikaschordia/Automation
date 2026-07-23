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
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { SortableTableHead, toggleSort, type SimpleSort } from "@/components/shared/sortable-table-head";
import { formatDate, toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DELAY_SORT_DISABLED_REASON = "Delay is calculated, not stored — sorting by it isn't available yet";

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

  const [delayFilters, setDelayFilters] = useState<TaskFiltersState>({ page: 1, pageSize: 10 });
  const [delaySort, setDelaySort] = useState<SimpleSort>({ by: "dueDate", dir: "desc" });
  const { data: delayData, isLoading: delayLoading } = useTasks({ ...delayFilters, sortBy: delaySort.by, sortDir: delaySort.dir });

  function applyDelayPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDelayFilters((f) => ({ ...f, dueFrom: toDateInputValue(from), dueTo: toDateInputValue(to), page: 1 }));
  }

  const [perfCompany, setPerfCompany] = useState("all");
  const [perfDept, setPerfDept] = useState("all");
  const [perfSort, setPerfSort] = useState<SimpleSort>({ by: "name", dir: "asc" });
  const { data: companies } = useCompanies({ enabled: isAdmin });
  const { data: departments } = useDepartments(perfCompany === "all" ? undefined : perfCompany, { enabled: isAdmin });
  const { data: performanceRows, isLoading: perfLoading } = useEmployeePerformanceReport({
    companyId: perfCompany === "all" ? undefined : perfCompany,
    departmentId: perfDept === "all" ? undefined : perfDept,
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

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="title" current={taskSort} onSort={(k) => setTaskSort((s) => toggleSort(s, k))}>
                    Task
                  </SortableTableHead>
                  <SortableTableHead sortKey="employee" current={taskSort} onSort={(k) => setTaskSort((s) => toggleSort(s, k))}>
                    Employee
                  </SortableTableHead>
                  <SortableTableHead sortKey="company" current={taskSort} onSort={(k) => setTaskSort((s) => toggleSort(s, k))}>
                    Company
                  </SortableTableHead>
                  <SortableTableHead sortKey="department" current={taskSort} onSort={(k) => setTaskSort((s) => toggleSort(s, k))}>
                    Department
                  </SortableTableHead>
                  <SortableTableHead sortKey="priority" current={taskSort} onSort={(k) => setTaskSort((s) => toggleSort(s, k))}>
                    Priority
                  </SortableTableHead>
                  <SortableTableHead sortKey="status" current={taskSort} onSort={(k) => setTaskSort((s) => toggleSort(s, k))}>
                    Status
                  </SortableTableHead>
                  <SortableTableHead sortKey="dueDate" current={taskSort} onSort={(k) => setTaskSort((s) => toggleSort(s, k))}>
                    Due Date
                  </SortableTableHead>
                  <SortableTableHead sortKey="completedDate" current={taskSort} onSort={(k) => setTaskSort((s) => toggleSort(s, k))}>
                    Completed Date
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="delay"
                    current={taskSort}
                    onSort={() => {}}
                    className="text-right"
                    align="right"
                    disabledReason={DELAY_SORT_DISABLED_REASON}
                  >
                    Delay
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!isLoading && data?.tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      No tasks match this report.
                    </TableCell>
                  </TableRow>
                )}
                {data?.tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="max-w-64 truncate font-medium" title={t.title}>{t.title}</TableCell>
                    <TableCell>{t.assignedTo.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.company.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.department.name}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={t.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>{formatDate(t.dueDate)}</TableCell>
                    <TableCell>{formatDate(t.completedDate)}</TableCell>
                    <TableCell className="text-right">{t.delayDays > 0 ? <span className="font-medium text-red-600">{t.delayDays}d</span> : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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

          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="employee" current={delaySort} onSort={(k) => setDelaySort((s) => toggleSort(s, k))}>
                    Employee
                  </SortableTableHead>
                  <SortableTableHead sortKey="company" current={delaySort} onSort={(k) => setDelaySort((s) => toggleSort(s, k))}>
                    Company
                  </SortableTableHead>
                  <SortableTableHead sortKey="taskNumber" current={delaySort} onSort={(k) => setDelaySort((s) => toggleSort(s, k))}>
                    Task ID
                  </SortableTableHead>
                  <SortableTableHead sortKey="title" current={delaySort} onSort={(k) => setDelaySort((s) => toggleSort(s, k))}>
                    Task Name
                  </SortableTableHead>
                  <SortableTableHead sortKey="priority" current={delaySort} onSort={(k) => setDelaySort((s) => toggleSort(s, k))}>
                    Priority
                  </SortableTableHead>
                  <SortableTableHead sortKey="status" current={delaySort} onSort={(k) => setDelaySort((s) => toggleSort(s, k))}>
                    Status
                  </SortableTableHead>
                  <SortableTableHead sortKey="assignedDate" current={delaySort} onSort={(k) => setDelaySort((s) => toggleSort(s, k))}>
                    Assigned Date
                  </SortableTableHead>
                  <SortableTableHead sortKey="dueDate" current={delaySort} onSort={(k) => setDelaySort((s) => toggleSort(s, k))}>
                    Due Date
                  </SortableTableHead>
                  <SortableTableHead sortKey="completedDate" current={delaySort} onSort={(k) => setDelaySort((s) => toggleSort(s, k))}>
                    Completed Date
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="delay"
                    current={delaySort}
                    onSort={() => {}}
                    className="text-right"
                    align="right"
                    disabledReason={DELAY_SORT_DISABLED_REASON}
                  >
                    Delay (days)
                  </SortableTableHead>
                  <SortableTableHead sortKey="remarks" current={delaySort} onSort={(k) => setDelaySort((s) => toggleSort(s, k))}>
                    Remarks
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delayLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 11 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!delayLoading && delayData?.tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                      No tasks match this report.
                    </TableCell>
                  </TableRow>
                )}
                {delayData?.tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{t.assignedTo.name}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{t.company.name}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-primary">{t.taskNumber}</TableCell>
                    <TableCell className="max-w-56 truncate font-medium" title={t.title}>{t.title}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={t.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(t.assignedDate)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(t.dueDate)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(t.completedDate)}</TableCell>
                    <TableCell className="text-right">
                      {t.delayDays > 0 ? <span className="font-medium text-red-600">{t.delayDays}</span> : "—"}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground" title={t.remarks || undefined}>{t.remarks || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <Select value={perfCompany} onValueChange={(v) => { setPerfCompany(v); setPerfDept("all"); }}>
                  <SelectTrigger className="w-48">
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
                <Select value={perfDept} onValueChange={setPerfDept} disabled={perfCompany === "all"}>
                  <SelectTrigger className="w-48">
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
              </>
            )}
            <Button
              asChild
              className="ml-auto"
            >
              <a
                href={`/api/reports/employee-performance/export?${new URLSearchParams({
                  ...(perfCompany !== "all" ? { companyId: perfCompany } : {}),
                  ...(perfDept !== "all" ? { departmentId: perfDept } : {}),
                  sortBy: perfSort.by,
                  sortDir: perfSort.dir,
                }).toString()}`}
              >
                <Download className="size-4" /> Export to Excel
              </a>
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead sortKey="name" current={perfSort} onSort={(k) => setPerfSort((s) => toggleSort(s, k))}>
                      Employee
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="total"
                      current={perfSort}
                      onSort={(k) => setPerfSort((s) => toggleSort(s, k))}
                      className="text-center"
                      align="center"
                    >
                      Total
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="completed"
                      current={perfSort}
                      onSort={(k) => setPerfSort((s) => toggleSort(s, k))}
                      className="text-center"
                      align="center"
                    >
                      Completed
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="pending"
                      current={perfSort}
                      onSort={(k) => setPerfSort((s) => toggleSort(s, k))}
                      className="text-center"
                      align="center"
                    >
                      Pending
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="delayed"
                      current={perfSort}
                      onSort={(k) => setPerfSort((s) => toggleSort(s, k))}
                      className="text-center"
                      align="center"
                    >
                      Delayed
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="avgDelayDays"
                      current={perfSort}
                      onSort={(k) => setPerfSort((s) => toggleSort(s, k))}
                      className="text-center"
                      align="center"
                    >
                      Avg Delay
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="avgCompletionDays"
                      current={perfSort}
                      onSort={(k) => setPerfSort((s) => toggleSort(s, k))}
                      className="text-center"
                      align="center"
                    >
                      Avg Completion
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="completionPercent"
                      current={perfSort}
                      onSort={(k) => setPerfSort((s) => toggleSort(s, k))}
                      className="text-center"
                      align="center"
                    >
                      Completion %
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perfLoading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!perfLoading && performanceRows?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        No active employees match this filter.
                      </TableCell>
                    </TableRow>
                  )}
                  {performanceRows?.map((r) => (
                    <TableRow key={r.employeeId}>
                      <TableCell>
                        <div className="font-medium leading-tight">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.designation} · {r.department}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{r.total}</TableCell>
                      <TableCell className="text-center">{r.completed}</TableCell>
                      <TableCell className="text-center">{r.pending}</TableCell>
                      <TableCell className="text-center">
                        {r.delayed > 0 ? <span className="font-medium text-red-600">{r.delayed}</span> : 0}
                      </TableCell>
                      <TableCell className="text-center">{r.avgDelayDays}d</TableCell>
                      <TableCell className="text-center">{r.avgCompletionDays}d</TableCell>
                      <TableCell className="text-center">
                        <span className={r.completionPercent >= 75 ? "font-medium text-emerald-600" : ""}>{r.completionPercent}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
