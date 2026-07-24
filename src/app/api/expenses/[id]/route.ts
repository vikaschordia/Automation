import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { assertExpenseAccess, resolveAccessibleCompanyFilter } from "@/lib/rbac";
import { expenseUpdateSchema } from "@/lib/validations/expense";
import { updateExpense, deleteExpense } from "@/lib/services/expense-service";
import { logAudit } from "@/lib/services/audit-service";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    await assertExpenseAccess(session);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = expenseUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const existing = await prisma.monthlyExpense.findUnique({ where: { id }, select: { companyId: true } });
    if (!existing) throw new ApiError(404, "Expense not found");
    await resolveAccessibleCompanyFilter(session, existing.companyId);
    if (parsed.data.companyId) await resolveAccessibleCompanyFilter(session, parsed.data.companyId);
    const expense = await updateExpense(id, parsed.data);
    await logAudit({ session, action: "UPDATE", entityType: "EXPENSE", entityId: id, summary: `Updated expense "${expense.name}"` });
    return NextResponse.json({ expense });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    await assertExpenseAccess(session);
    const { id } = await params;
    const existing = await prisma.monthlyExpense.findUnique({ where: { id }, select: { name: true, companyId: true } });
    if (!existing) throw new ApiError(404, "Expense not found");
    await resolveAccessibleCompanyFilter(session, existing.companyId);
    await deleteExpense(id);
    await logAudit({ session, action: "DELETE", entityType: "EXPENSE", entityId: id, summary: `Deleted expense "${existing.name}"` });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
