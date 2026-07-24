import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { assertExpenseAccess, resolveAccessibleCompanyFilter } from "@/lib/rbac";
import { listExpenses } from "@/lib/services/expense-service";
import { addExpenseSheet } from "@/lib/excel/expense-sheet";
import { excelResponseHeaders, toResponseBody, workbookToBuffer } from "@/lib/excel/task-list-sheet";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await assertExpenseAccess(session);
    const now = new Date();
    const year = Number(request.nextUrl.searchParams.get("year")) || now.getFullYear();
    const month = Number(request.nextUrl.searchParams.get("month")) || now.getMonth() + 1;

    const companyFilter = await resolveAccessibleCompanyFilter(session, request.nextUrl.searchParams.get("companyId"));
    const expenses = await listExpenses(year, month, companyFilter);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Daily Task Tracker";
    workbook.created = new Date();

    addExpenseSheet(workbook, expenses, {
      title: `Monthly Expenses — ${MONTH_NAMES[month - 1]} ${year}`,
      generatedBy: session.name,
    });

    const buffer = await workbookToBuffer(workbook);
    return new NextResponse(toResponseBody(buffer), {
      headers: excelResponseHeaders(`expenses-${year}-${String(month).padStart(2, "0")}.xlsx`),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
