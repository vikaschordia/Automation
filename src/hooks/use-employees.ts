import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { EmployeeInput } from "@/lib/validations/employee";
import type { EmployeeStatus } from "@/lib/constants";

export interface EmployeeRow {
  id: string;
  employeeCode: string;
  name: string;
  designation: string;
  email: string;
  phone: string | null;
  status: EmployeeStatus;
  joiningDate: string;
  departmentId: string;
  companyId: string;
  managerId: string | null;
  company: { id: string; name: string };
  department: { id: string; name: string };
  additionalCompanies: { id: string; name: string }[];
  manager: { id: string; name: string } | null;
  user: { id: string; isActive: boolean; lastLoginAt: string | null } | null;
  _count: { assignedTasks: number };
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useEmployees(
  filters?: { companyId?: string; departmentId?: string; status?: string; search?: string },
  options?: { enabled?: boolean },
) {
  const params = new URLSearchParams();
  if (filters?.companyId) params.set("companyId", filters.companyId);
  if (filters?.departmentId) params.set("departmentId", filters.departmentId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);

  return useQuery<EmployeeRow[]>({
    queryKey: ["employees", filters ?? {}],
    queryFn: async () => {
      const res = await fetch(`/api/employees?${params.toString()}`);
      const data = await jsonOrThrow(res);
      return data.employees;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeInput) =>
      jsonOrThrow(await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<EmployeeInput> }) =>
      jsonOrThrow(await fetch(`/api/employees/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => jsonOrThrow(await fetch(`/api/employees/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
