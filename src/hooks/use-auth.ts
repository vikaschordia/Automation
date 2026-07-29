import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ChangePasswordInput } from "@/lib/validations/auth";

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) =>
      jsonOrThrow(
        await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: () => toast.success("Password changed"),
    onError: (e: Error) => toast.error(e.message),
  });
}
