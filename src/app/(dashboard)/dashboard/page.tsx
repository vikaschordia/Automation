"use client";

import {
  ListChecks,
  Clock,
  CheckCircle2,
  AlarmClockOff,
  CalendarClock,
  Flame,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useAdminDashboard } from "@/hooks/use-dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import {
  CountByGroupChart,
  EmployeePerformanceChart,
  PriorityDistributionChart,
  TrendLineChart,
} from "@/components/dashboard/charts";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of tasks across all companies." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, charts, alerts } = data;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of tasks across all companies." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Tasks" value={stats.total} icon={ListChecks} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="success" />
        <StatCard label="Delayed" value={stats.delayed} icon={AlarmClockOff} tone="danger" />
        <StatCard label="Today's Due" value={stats.dueToday} icon={CalendarClock} tone="warning" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlarmClockOff} tone="danger" />
        <StatCard label="High Priority" value={stats.highPriority} icon={Flame} tone="warning" />
        <StatCard label="Avg. Completion" value={`${stats.avgCompletionDays}d`} icon={Timer} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4" /> Task Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-6">
            <div className="text-4xl font-semibold tracking-tight">{stats.completionPercent}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completed} of {stats.total} tasks completed
            </p>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Dashboard Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertsPanel alerts={alerts} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Tasks by Department">
          <CountByGroupChart data={charts.byDepartment} />
        </ChartCard>
        <ChartCard title="Tasks by Company">
          <CountByGroupChart data={charts.byCompany} />
        </ChartCard>
        <ChartCard title="Priority Distribution">
          <PriorityDistributionChart data={charts.byPriority} />
        </ChartCard>
        <ChartCard title="Employee Performance" subtitle="Completion rate per employee">
          <EmployeePerformanceChart data={charts.employeePerformance} />
        </ChartCard>
        <ChartCard title="Monthly Completion Trend" subtitle="Tasks completed per month">
          <TrendLineChart data={charts.monthlyCompletionTrend} name="Completed" tone="good" />
        </ChartCard>
        <ChartCard title="Delay Trend" subtitle="Average delay (days) per month">
          <TrendLineChart data={charts.delayTrend} name="Avg delay (days)" tone="critical" />
        </ChartCard>
      </div>
    </div>
  );
}
