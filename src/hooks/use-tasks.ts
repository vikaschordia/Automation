import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TaskCreateInput, TaskUpdateInput } from "@/lib/validations/task";
import type { TaskPriority, TaskStatus } from "@/lib/constants";

export interface TaskRow {
  id: string;
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
  /** Shared by every linked copy when this task was assigned to multiple employees at once. */
  groupId: string | null;
  assignedTo: { id: string; name: string; employeeCode: string; designation: string };
  assignedBy: { id: string; email: string };
  department: { id: string; name: string };
  company: { id: string; name: string };
  category: { id: string; name: string } | null;
}

export interface GroupSummary {
  total: number;
  completedCount: number;
  label: "Completed" | "Partially Completed" | "Pending";
}

export interface TaskDetailResponse {
  task: TaskRow;
  history: {
    id: string;
    action: string;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
    changedBy: { id: string; email: string; role: string };
  }[];
  linkedTasks: TaskRow[];
  groupSummary: GroupSummary | null;
}

export interface TaskFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  status?: string[];
  priority?: string[];
  companyId?: string[];
  departmentId?: string[];
  categoryId?: string[];
  assignedToId?: string[];
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
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
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

export function useTask(id: string | null) {
  return useQuery<TaskDetailResponse>({
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
    onSuccess: (data: { task: TaskRow; linkedTasks: TaskRow[] }) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(data.linkedTasks.length > 0 ? `Task created for ${data.linkedTasks.length + 1} employees` : "Task created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTask(options?: { silent?: boolean }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<TaskUpdateInput> }) =>
      jsonOrThrow(await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: (data: { task: TaskRow; linkedTasks: TaskRow[] }, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", variables.id] });
      if (!options?.silent) {
        toast.success(data.linkedTasks?.length > 0 ? `Task updated, linked ${data.linkedTasks.length} more employee(s)` : "Task updated");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => jsonOrThrow(await fetch(`/api/tasks/${id}`, { method: "DELETE" })),
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
    mutationFn: async (input: { taskIds: string[]; patch: Record<string, unknown> }) =>
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
    mutationFn: async (taskIds: string[]) =>
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
