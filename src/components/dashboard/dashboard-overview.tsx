"use client";

import Link from "next/link";
import { ListChecks, Clock, CheckCircle2, AlarmClockOff, CalendarClock, Flame, Timer, TrendingUp } from "lucide-react";
import type { AdminDashboardData } from "@/hooks/use-dashboard";
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

/**
 * The stat cards / charts / alerts layout shared by both the admin Dashboard and an employee's
 * own "My Dashboard" — the only difference between the two is what data feeds it (see
 * getDashboardData in dashboard-service.ts), not the layout itself.
 */
export function DashboardOverview({ data }: { data: AdminDashboardData }) {
  const { stats, charts, alerts } = data;

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Tasks" value={stats.total} icon={ListChecks} href="/tasks" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} href="/tasks?status=PENDING" />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          tone="success"
          href="/tasks?status=COMPLETED"
        />
        <StatCard label="Delayed" value={stats.delayed} icon={AlarmClockOff} tone="danger" href="/tasks?status=DELAYED" />
        <StatCard
          label="Today's Due"
          value={stats.dueToday}
          icon={CalendarClock}
          tone="warning"
          href="/tasks?bucket=dueToday"
        />
        <StatCard label="Overdue" value={stats.overdue} icon={AlarmClockOff} tone="danger" href="/tasks?bucket=overdue" />
        <StatCard
          label="High Priority"
          value={stats.highPriority}
          icon={Flame}
          tone="warning"
          href="/tasks?bucket=highPriorityOpen"
        />
        <StatCard label="Avg. Completion" value={`${stats.avgCompletionDays}d`} icon={Timer} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link href="/tasks?status=COMPLETED" className="lg:col-span-1">
          <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/50">
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
        </Link>
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
    </>
  );
}
