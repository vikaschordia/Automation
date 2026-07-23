"use client";

import { useEmployeeDashboard } from "@/hooks/use-dashboard";
import { useSession } from "@/components/layout/session-provider";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDashboardPage() {
  const { name } = useSession();
  const { data, isLoading } = useEmployeeDashboard();

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title={`Welcome back, ${name.split(" ")[0]}`} description="Overview of your tasks." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Welcome back, ${name.split(" ")[0]}`} description="Overview of your tasks — same as the admin view, scoped to you." />
      <DashboardOverview data={data} />
    </div>
  );
}
