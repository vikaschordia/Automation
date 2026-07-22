import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NoteUpdateInput } from "@/lib/validations/note";

export interface NoteRow {
  id: string;
  content: string;
  done: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useNotes() {
  return useQuery<{ notes: NoteRow[] }>({
    queryKey: ["notes"],
    queryFn: async () => jsonOrThrow(await fetch("/api/notes")),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      jsonOrThrow(await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: NoteUpdateInput }) =>
      jsonOrThrow(await fetch(`/api/notes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => jsonOrThrow(await fetch(`/api/notes/${id}`, { method: "DELETE" })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}
