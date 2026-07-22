"use client";

import Link from "next/link";
import { ListChecks, Clock, CheckCircle2, AlarmClockOff, Flame, Activity, ArrowRight } from "lucide-react";
import { useEmployeeDashboard, type EmployeeTaskRow } from "@/hooks/use-dashboard";
import { useSession } from "@/components/layout/session-provider";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRelative } from "@/lib/format";

function ViewAllLink({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
      View all <ArrowRight className="size-3" />
    </Link>
  );
}

function TaskList({ tasks, emptyMessage }: { tasks: EmployeeTaskRow[]; emptyMessage: string }) {
  if (tasks.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  return (
    <div className="flex flex-col gap-1">
      {tasks.map((task) => (
        <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={task.title}>{task.title}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Due {formatDate(task.dueDate)}</span>
              <StatusBadge status={task.status} />
            </div>
          </div>
          <div className="w-20 shrink-0">
            <Progress value={task.progressPercent} className="h-1.5" />
          </div>
          <PriorityBadge priority={task.priority} className="shrink-0" />
        </Link>
      ))}
    </div>
  );
}

export default function EmployeeDashboardPage() {
  const { name } = useSession();
  const { data, isLoading } = useEmployeeDashboard();

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="My Dashboard" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, todaysTasks, pendingTasks, urgentTasks, upcomingTasks, recentActivity } = data;

  return (
    <div>
      <PageHeader title={`Welcome back, ${name.split(" ")[0]}`} description="Here's what's on your plate today." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Tasks" value={stats.total} icon={ListChecks} href="/tasks" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} href="/tasks?status=PENDING" />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          tone="success"
          href="/tasks?status=COMPLETED"
        />
        <StatCard label="Overdue" value={stats.overdue} icon={AlarmClockOff} tone="danger" href="/tasks?bucket=overdue" />
        <StatCard label="Urgent" value={stats.urgent} icon={Flame} tone="warning" href="/tasks?bucket=highPriorityOpen" />
        <StatCard
          label="Completion"
          value={`${stats.completionPercent}%`}
          icon={ListChecks}
          tone="success"
          href="/tasks?status=COMPLETED"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Today&apos;s Tasks</CardTitle>
              {todaysTasks.length > 0 && <ViewAllLink href="/tasks?bucket=dueToday" />}
            </CardHeader>
            <CardContent>
              <TaskList tasks={todaysTasks} emptyMessage="Nothing due today." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Urgent Tasks</CardTitle>
              {urgentTasks.length > 0 && <ViewAllLink href="/tasks?bucket=highPriorityOpen" />}
            </CardHeader>
            <CardContent>
              <TaskList tasks={urgentTasks} emptyMessage="No urgent tasks right now." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Upcoming Due Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList tasks={upcomingTasks} emptyMessage="Nothing coming up." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Pending Tasks</CardTitle>
              {pendingTasks.length > 0 && <ViewAllLink href="/tasks?status=PENDING" />}
            </CardHeader>
            <CardContent>
              <TaskList tasks={pendingTasks} emptyMessage="No pending tasks." />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>}
            <ol className="flex flex-col gap-3">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <Link href={`/tasks/${entry.taskId}`} className="line-clamp-1 font-medium hover:underline" title={entry.taskTitle}>
                    {entry.taskTitle}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {entry.action.replace("_", " ").toLowerCase()} by {entry.changedByEmail} · {formatRelative(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
