import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TaskCreateInput, TaskUpdateInput } from "@/lib/validations/task";
import type { TaskPriority, TaskStatus } from "@/lib/constants";

export interface TaskRow {
  id: number;
  taskNumber: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignedDate: string;
  dueDate: string;
  completedDate: string | null;
  progressPercent: number;
  estimatedHours: number | null;
  actualHours: number | null;
  remarks: string | null;
  tags: string[];
  delayDays: number;
  isOverdue: boolean;
  isDueToday: boolean;
  assignedTo: { id: string; name: string; employeeCode: string; designation: string };
  assignedBy: { id: string; email: string };
  department: { id: string; name: string };
  company: { id: string; name: string };
  category: { id: string; name: string } | null;
}

export interface TaskFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  status?: string;
  priority?: string;
  companyId?: string;
  departmentId?: string;
  categoryId?: string;
  assignedToId?: string;
  dueFrom?: string;
  dueTo?: string;
  /** overdue | dueToday | dueTomorrow | highPriorityOpen — see buildTaskWhere in task-service.ts */
  bucket?: string;
}

interface TaskListResponse {
  tasks: TaskRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function buildTaskQuery(filters: TaskFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

export function useTasks(filters: TaskFilters) {
  return useQuery<TaskListResponse>({
    queryKey: ["tasks", filters],
    queryFn: async () => jsonOrThrow(await fetch(`/api/tasks?${buildTaskQuery(filters)}`)),
    placeholderData: keepPreviousData,
  });
}

export function useTask(id: number | null) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: async () => jsonOrThrow(await fetch(`/api/tasks/${id}`)),
    enabled: id != null,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskCreateInput) =>
      jsonOrThrow(await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTask(options?: { silent?: boolean }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<TaskUpdateInput> }) =>
      jsonOrThrow(await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", variables.id] });
      if (!options?.silent) toast.success("Task updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => jsonOrThrow(await fetch(`/api/tasks/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkUpdateTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { taskIds: number[]; patch: Record<string, unknown> }) =>
      jsonOrThrow(await fetch("/api/tasks/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Updated ${data.updated} task(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkDeleteTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskIds: number[]) =>
      jsonOrThrow(
        await fetch("/api/tasks/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIds }),
        }),
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Deleted ${data.deleted} task(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTaskCategories() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ["task-categories"],
    queryFn: async () => {
      const data = await jsonOrThrow(await fetch("/api/task-categories"));
      return data.categories;
    },
  });
}
