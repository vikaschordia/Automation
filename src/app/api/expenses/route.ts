import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { assertExpenseAccess, resolveAccessibleCompanyFilter } from "@/lib/rbac";
import { expenseCreateSchema } from "@/lib/validations/expense";
import { listExpenses, createExpense } from "@/lib/services/expense-service";
import { logAudit } from "@/lib/services/audit-service";

function parseYearMonth(params: URLSearchParams): { year: number; month: number } {
  const now = new Date();
  const year = Number(params.get("year")) || now.getFullYear();
  const month = Number(params.get("month")) || now.getMonth() + 1;
  return { year, month };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await assertExpenseAccess(session);
    const { year, month } = parseYearMonth(request.nextUrl.searchParams);
    const companyFilter = await resolveAccessibleCompanyFilter(session, request.nextUrl.searchParams.get("companyId"));
    const expenses = await listExpenses(year, month, companyFilter);
    return NextResponse.json({ expenses, year, month });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    await assertExpenseAccess(session);
    const body = await request.json().catch(() => null);
    const parsed = expenseCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    await resolveAccessibleCompanyFilter(session, parsed.data.companyId);
    const expense = await createExpense(parsed.data);
    await logAudit({ session, action: "CREATE", entityType: "EXPENSE", entityId: expense.id, summary: `Created expense "${expense.name}"` });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
