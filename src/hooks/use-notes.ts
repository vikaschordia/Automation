import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/layout/session-provider";
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
  const { email } = useSession();
  // Scoping the cache key to the logged-in user's email is a belt-and-suspenders measure on top
  // of clearing the query cache on logout (user-nav.tsx): even if the same browser tab somehow
  // still held another account's cached query data, this key could never resolve to it.
  return useQuery<{ notes: NoteRow[] }>({
    queryKey: ["notes", email],
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
