import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { assertExpenseAccess } from "@/lib/rbac";
import { expenseUpdateSchema } from "@/lib/validations/expense";
import { updateExpense, deleteExpense } from "@/lib/services/expense-service";

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
    const expense = await updateExpense(id, parsed.data);
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
    await deleteExpense(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
