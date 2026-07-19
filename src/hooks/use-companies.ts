import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CompanyInput } from "@/lib/validations/company";

export interface CompanyRow {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
  _count: { departments: number; employees: number; tasks: number };
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useCompanies(options?: { enabled?: boolean }) {
  return useQuery<CompanyRow[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      const data = await jsonOrThrow(res);
      return data.companies;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CompanyInput) =>
      jsonOrThrow(await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CompanyInput> }) =>
      jsonOrThrow(await fetch(`/api/companies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => jsonOrThrow(await fetch(`/api/companies/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
