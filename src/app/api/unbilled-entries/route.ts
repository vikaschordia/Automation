import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { assertUnbilledEntryAccess, resolveAccessibleCompanyFilter } from "@/lib/rbac";
import { unbilledEntryCreateSchema } from "@/lib/validations/unbilled-entry";
import { listUnbilledEntries, createUnbilledEntry } from "@/lib/services/unbilled-entry-service";
import { logAudit } from "@/lib/services/audit-service";
import { parseMultiParam } from "@/lib/query-params";

function parseYearMonth(params: URLSearchParams): { year: number; month: number } {
  const now = new Date();
  const year = Number(params.get("year")) || now.getFullYear();
  const month = Number(params.get("month")) || now.getMonth() + 1;
  return { year, month };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await assertUnbilledEntryAccess(session);
    const { year, month } = parseYearMonth(request.nextUrl.searchParams);
    const companyFilter = await resolveAccessibleCompanyFilter(session, parseMultiParam(request.nextUrl.searchParams, "companyId"));
    const entries = await listUnbilledEntries(year, month, companyFilter);
    return NextResponse.json({ entries, year, month });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    await assertUnbilledEntryAccess(session);
    const body = await request.json().catch(() => null);
    const parsed = unbilledEntryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    await resolveAccessibleCompanyFilter(session, parsed.data.companyId);
    const entry = await createUnbilledEntry(parsed.data);
    await logAudit({
      session,
      action: "CREATE",
      entityType: "UNBILLED_ENTRY",
      entityId: entry.id,
      summary: `Created unbilled entry "${entry.description}"`,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
