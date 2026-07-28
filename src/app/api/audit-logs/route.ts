import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { getAuditLogs } from "@/lib/services/audit-service";
import { parseMultiParam } from "@/lib/query-params";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, type AuditAction, type AuditEntityType } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const params = request.nextUrl.searchParams;

    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.get("pageSize")) || 25));

    const entityTypes = parseMultiParam(params, "entityType")?.filter((v) => (AUDIT_ENTITY_TYPES as readonly string[]).includes(v)) as
      | AuditEntityType[]
      | undefined;
    const actions = parseMultiParam(params, "action")?.filter((v) => (AUDIT_ACTIONS as readonly string[]).includes(v)) as AuditAction[] | undefined;
    const fromParam = params.get("from");
    const toParam = params.get("to");

    const result = await getAuditLogs(
      {
        from: fromParam ? new Date(fromParam) : undefined,
        // Include the whole "to" day, not just midnight.
        to: toParam ? new Date(new Date(toParam).getTime() + 24 * 60 * 60 * 1000 - 1) : undefined,
        entityType: entityTypes,
        action: actions,
        search: params.get("search")?.trim() || undefined,
      },
      page,
      pageSize,
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
