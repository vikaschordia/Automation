"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Users2 } from "lucide-react";
import { useTasks, buildTaskQuery, type TaskFilters as TaskFiltersState } from "@/hooks/use-tasks";
import { useEmployeePerformanceReport } from "@/hooks/use-reports";
import { useCompanies } from "@/hooks/use-companies";
import { useDepartments } from "@/hooks/use-departments";
import { PageHeader } from "@/components/shared/page-header";
import { TaskFilters } from "@/components/tasks/task-filters";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { formatDate, toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DATE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "This year", days: 365 },
] as const;

export default function ReportsPage() {
  const [filters, setFilters] = useState<TaskFiltersState>({ page: 1, pageSize: 10 });
  // Newest-due first by default. Without an explicit sort this fell back to the same
  // ascending-due-date order the spreadsheet view uses, which is right for "what's due soon" but
  // wrong for a report preview: it always surfaces the very oldest matching tasks on page 1 —
  // e.g. selecting no filters at all looked like "only completed tasks exist" because ancient,
  // long-since-completed tasks sort first.
  const { data, isLoading } = useTasks({ ...filters, sortBy: "dueDate", sortDir: "desc" });

  const [perfCompany, setPerfCompany] = useState("all");
  const [perfDept, setPerfDept] = useState("all");
  const { data: companies } = useCompanies();
  const { data: departments } = useDepartments(perfCompany === "all" ? undefined : perfCompany);
  const { data: performanceRows, isLoading: perfLoading } = useEmployeePerformanceReport({
    companyId: perfCompany === "all" ? undefined : perfCompany,
    departmentId: perfDept === "all" ? undefined : perfDept,
  });

  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFilters((f) => ({ ...f, dueFrom: toDateInputValue(from), dueTo: toDateInputValue(to), page: 1 }));
  }

  return (
    <div>
      <PageHeader title="Reports" description="Employee, department, company, priority, status and date-range reports — export any of them to Excel." />

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1.5">
            <FileSpreadsheet className="size-3.5" /> Task Reports
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

          <TaskFilters role="ADMIN" filters={filters} onChange={setFilters} />

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `${data?.total ?? 0} tasks match this report`} — preview shows the first {filters.pageSize}
            </p>
            <Button asChild>
              <a href={`/api/tasks/export?${buildTaskQuery({ ...filters, sortBy: "dueDate", sortDir: "desc" })}`}>
                <Download className="size-4" /> Export to Excel
              </a>
            </Button>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Company / Dept</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Delay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!isLoading && data?.tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No tasks match this report.
                    </TableCell>
                  </TableRow>
                )}
                {data?.tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="max-w-64 truncate font-medium">{t.title}</TableCell>
                    <TableCell>{t.assignedTo.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.company.name} / {t.department.name}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={t.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>{formatDate(t.dueDate)}</TableCell>
                    <TableCell className="text-right">{t.delayDays > 0 ? <span className="font-medium text-red-600">{t.delayDays}d</span> : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
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
            <Button
              asChild
              className="ml-auto"
            >
              <a
                href={`/api/reports/employee-performance/export?${new URLSearchParams({
                  ...(perfCompany !== "all" ? { companyId: perfCompany } : {}),
                  ...(perfDept !== "all" ? { departmentId: perfDept } : {}),
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
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Delayed</TableHead>
                    <TableHead className="text-center">Avg Delay</TableHead>
                    <TableHead className="text-center">Avg Completion</TableHead>
                    <TableHead className="text-center">Completion %</TableHead>
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
