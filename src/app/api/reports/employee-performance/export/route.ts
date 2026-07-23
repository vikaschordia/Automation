import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { getEmployeePerformanceReport } from "@/lib/services/report-service";
import { addEmployeePerformanceSheet } from "@/lib/excel/employee-performance-sheet";
import { excelResponseHeaders, toResponseBody, workbookToBuffer } from "@/lib/excel/task-list-sheet";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const params = request.nextUrl.searchParams;
    const rows = await getEmployeePerformanceReport(
      session.role === "ADMIN"
        ? {
            companyId: params.get("companyId") ?? undefined,
            departmentId: params.get("departmentId") ?? undefined,
            sortBy: params.get("sortBy") ?? undefined,
            sortDir: params.get("sortDir") === "desc" ? "desc" : "asc",
          }
        : {
            employeeId: session.employeeId ?? "__none__",
            sortBy: params.get("sortBy") ?? undefined,
            sortDir: params.get("sortDir") === "desc" ? "desc" : "asc",
          },
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Daily Task Tracker";
    workbook.created = new Date();
    addEmployeePerformanceSheet(workbook, rows, {
      title: session.role === "ADMIN" ? "Employee Performance Report" : `Performance — ${session.name}`,
      generatedBy: session.name,
    });

    const buffer = await workbookToBuffer(workbook);
    return new NextResponse(toResponseBody(buffer), { headers: excelResponseHeaders(`employee-performance-${Date.now()}.xlsx`) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
