import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UnbilledEntryCreateInput, UnbilledEntryUpdateInput } from "@/lib/validations/unbilled-entry";
import type { UnbilledEntryStatus } from "@/lib/constants";

export interface UnbilledEntryRow {
  id: string;
  description: string;
  companyId: string;
  company: { id: string; name: string };
  expectedDate: string;
  expectedAmount: number;
  status: UnbilledEntryStatus;
  entryDoneDate: string | null;
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

export function useUnbilledEntries(year: number, month: number, companyId?: string[]) {
  const companyParam = companyId?.length ? companyId.join(",") : undefined;
  return useQuery<{ entries: UnbilledEntryRow[] }>({
    queryKey: ["unbilled-entries", year, month, companyParam ?? "all"],
    queryFn: async () =>
      jsonOrThrow(
        await fetch(`/api/unbilled-entries?year=${year}&month=${month}${companyParam ? `&companyId=${companyParam}` : ""}`),
      ),
  });
}

export function useCreateUnbilledEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UnbilledEntryCreateInput) =>
      jsonOrThrow(
        await fetch("/api/unbilled-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unbilled-entries"] });
      toast.success("Entry added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateUnbilledEntry(options?: { silent?: boolean }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<UnbilledEntryUpdateInput> }) =>
      jsonOrThrow(
        await fetch(`/api/unbilled-entries/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unbilled-entries"] });
      if (!options?.silent) toast.success("Entry updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteUnbilledEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => jsonOrThrow(await fetch(`/api/unbilled-entries/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unbilled-entries"] });
      toast.success("Entry deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
