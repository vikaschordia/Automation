import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DepartmentInput } from "@/lib/validations/department";

export interface DepartmentRow {
  id: string;
  name: string;
  companyId: string;
  isActive: boolean;
  company: { id: string; name: string };
  _count: { employees: number; tasks: number };
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useDepartments(companyId?: string, options?: { enabled?: boolean }) {
  return useQuery<DepartmentRow[]>({
    queryKey: ["departments", companyId ?? "all"],
    queryFn: async () => {
      const res = await fetch(`/api/departments${companyId ? `?companyId=${companyId}` : ""}`);
      const data = await jsonOrThrow(res);
      return data.departments;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DepartmentInput) =>
      jsonOrThrow(await fetch("/api/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<DepartmentInput> }) =>
      jsonOrThrow(await fetch(`/api/departments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => jsonOrThrow(await fetch(`/api/departments/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
