import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuditAction, AuditEntityType } from "@/lib/constants";
import type { SessionPayload } from "@/lib/auth";

interface LogAuditParams {
  session: SessionPayload | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  summary: string;
  /** Only for LOGIN_FAILED, where there's no authenticated session to pull a name from. */
  actorNameOverride?: string;
}

/**
 * Fire-and-forget: a logging failure must never break the real mutation it's attached to, so this
 * swallows and reports errors instead of letting them propagate to the caller.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.session?.sub ?? null,
        userName: params.session?.name ?? params.actorNameOverride ?? "Unknown",
        userRole: params.session?.role ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        summary: params.summary,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
}

export interface AuditLogFilters {
  from?: Date;
  to?: Date;
  userId?: string;
  entityType?: AuditEntityType[];
  action?: AuditAction[];
  search?: string;
}

export async function getAuditLogs(filters: AuditLogFilters, page: number, pageSize: number) {
  const where: Prisma.AuditLogWhereInput = {
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.entityType?.length ? { entityType: { in: filters.entityType } } : {}),
    ...(filters.action?.length ? { action: { in: filters.action } } : {}),
    ...(filters.search
      ? { OR: [{ summary: { contains: filters.search } }, { userName: { contains: filters.search } }] }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
