import { useQuery } from "@tanstack/react-query";

export interface EmployeePerformanceRow {
  employeeId: string;
  employeeCode: string;
  name: string;
  designation: string;
  company: string;
  department: string;
  total: number;
  completed: number;
  pending: number;
  delayed: number;
  avgDelayDays: number;
  completionPercent: number;
  avgCompletionDays: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
}

export function useEmployeePerformanceReport(filters: {
  companyId?: string;
  departmentId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}) {
  const params = new URLSearchParams();
  if (filters.companyId) params.set("companyId", filters.companyId);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortDir) params.set("sortDir", filters.sortDir);

  return useQuery<EmployeePerformanceRow[]>({
    queryKey: ["reports", "employee-performance", filters],
    queryFn: async () => {
      const res = await fetch(`/api/reports/employee-performance?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      return data.rows;
    },
  });
}
