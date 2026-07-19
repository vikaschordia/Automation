import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { taskInclude } from "@/lib/services/task-service";
import { addTaskListSheet, excelResponseHeaders, toResponseBody, workbookToBuffer } from "@/lib/excel/task-list-sheet";

type Params = Promise<{ id: string }>;

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession(["ADMIN"]);
    const { id } = await params;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new ApiError(404, "Employee not found");

    const tasks = await prisma.task.findMany({
      where: { assignedToId: id, deletedAt: null },
      include: taskInclude,
      orderBy: { dueDate: "asc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Daily Task Tracker";
    workbook.created = new Date();

    addTaskListSheet(workbook, tasks, {
      sheetName: "Tasks",
      title: `Employee Report — ${employee.name} (${employee.employeeCode})`,
      generatedBy: session.name,
    });

    const buffer = await workbookToBuffer(workbook);
    const filename = `employee-report-${employee.employeeCode}-${Date.now()}.xlsx`;
    return new NextResponse(toResponseBody(buffer), { headers: excelResponseHeaders(filename) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
