import { useQuery } from "@tanstack/react-query";
import type { TaskPriority, TaskStatus } from "@/lib/constants";

export interface AdminDashboardData {
  stats: {
    total: number;
    pending: number;
    completed: number;
    delayed: number;
    overdue: number;
    dueToday: number;
    highPriority: number;
    avgCompletionDays: number;
    completionPercent: number;
  };
  charts: {
    byDepartment: { name: string; count: number }[];
    byCompany: { name: string; count: number }[];
    byPriority: { priority: TaskPriority; count: number }[];
    employeePerformance: { name: string; completionRate: number }[];
    monthlyCompletionTrend: { period: string; value: number }[];
    delayTrend: { period: string; value: number }[];
  };
  alerts: {
    dueToday: AlertTask[];
    overdue: AlertTask[];
    dueTomorrow: AlertTask[];
    highPriority: AlertTask[];
  };
}

export interface AlertTask {
  id: string;
  taskNumber: string;
  title: string;
  priority: TaskPriority;
  dueDate: string;
  assignedToName: string;
}

export interface EmployeeTaskRow {
  id: string;
  taskNumber: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  progressPercent: number;
}

export interface EmployeeDashboardData {
  stats: { total: number; completed: number; pending: number; completionPercent: number; overdue: number; urgent: number };
  todaysTasks: EmployeeTaskRow[];
  pendingTasks: EmployeeTaskRow[];
  urgentTasks: EmployeeTaskRow[];
  upcomingTasks: EmployeeTaskRow[];
  recentActivity: { id: string; action: string; field: string | null; createdAt: string; taskId: string; taskTitle: string; changedByEmail: string }[];
}

export function useAdminDashboard() {
  return useQuery<AdminDashboardData>({
    queryKey: ["dashboard", "admin"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/admin");
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
    refetchInterval: 60_000,
  });
}

export function useEmployeeDashboard() {
  return useQuery<EmployeeDashboardData>({
    queryKey: ["dashboard", "employee"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/employee");
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
    refetchInterval: 60_000,
  });
}
