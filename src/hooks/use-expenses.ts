import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ExpenseCreateInput, ExpenseUpdateInput } from "@/lib/validations/expense";
import type { ExpenseStatus } from "@/lib/constants";

export interface ExpenseRow {
  id: string;
  name: string;
  dueDate: string;
  amount: number;
  status: ExpenseStatus;
  paidDate: string | null;
  isRecurring: boolean;
  recurringGroupId: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useExpenses(year: number, month: number) {
  return useQuery<{ expenses: ExpenseRow[] }>({
    queryKey: ["expenses", year, month],
    queryFn: async () => jsonOrThrow(await fetch(`/api/expenses?year=${year}&month=${month}`)),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseCreateInput) =>
      jsonOrThrow(
        await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateExpense(options?: { silent?: boolean }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ExpenseUpdateInput> }) =>
      jsonOrThrow(
        await fetch(`/api/expenses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      if (!options?.silent) toast.success("Expense updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => jsonOrThrow(await fetch(`/api/expenses/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
