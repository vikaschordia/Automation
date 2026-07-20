import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TaskCategoryInput } from "@/lib/validations/task-category";

export interface TaskCategoryRow {
  id: string;
  name: string;
  createdAt: string;
  _count: { tasks: number };
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useTaskCategoriesList() {
  return useQuery<TaskCategoryRow[]>({
    queryKey: ["task-categories"],
    queryFn: async () => {
      const data = await jsonOrThrow(await fetch("/api/task-categories"));
      return data.categories;
    },
  });
}

export function useCreateTaskCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskCategoryInput) =>
      jsonOrThrow(
        await fetch("/api/task-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-categories"] });
      toast.success("Category created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTaskCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TaskCategoryInput }) =>
      jsonOrThrow(
        await fetch(`/api/task-categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-categories"] });
      toast.success("Category updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTaskCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => jsonOrThrow(await fetch(`/api/task-categories/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-categories"] });
      toast.success("Category deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
