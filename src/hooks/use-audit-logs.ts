import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { AuditAction, AuditEntityType } from "@/lib/constants";

export interface AuditLogRow {
  id: string;
  userId: string | null;
  userName: string;
  userRole: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  summary: string;
  createdAt: string;
}

export interface AuditLogFilters {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  entityType?: AuditEntityType[];
  action?: AuditAction[];
  search?: string;
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useAuditLogs(filters: AuditLogFilters) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.entityType?.length) params.set("entityType", filters.entityType.join(","));
  if (filters.action?.length) params.set("action", filters.action.join(","));
  if (filters.search) params.set("search", filters.search);

  return useQuery<{ rows: AuditLogRow[]; total: number; page: number; pageSize: number; totalPages: number }>({
    queryKey: ["audit-logs", filters],
    queryFn: async () => jsonOrThrow(await fetch(`/api/audit-logs?${params.toString()}`)),
    placeholderData: keepPreviousData,
  });
}
