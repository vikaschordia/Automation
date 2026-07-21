import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { buildTaskOrderBy, buildTaskWhere, taskInclude } from "@/lib/services/task-service";
import { excelResponseHeaders, toResponseBody, workbookToBuffer } from "@/lib/excel/task-list-sheet";
import { addTaskDelayReportSheet } from "@/lib/excel/task-delay-report-sheet";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const params = request.nextUrl.searchParams;
    const where = buildTaskWhere(params, session);
    const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";
    const orderBy = buildTaskOrderBy(params.get("sortBy") ?? "dueDate", sortDir);

    const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Daily Task Tracker";
    workbook.created = new Date();

    addTaskDelayReportSheet(workbook, tasks, {
      title: session.role === "ADMIN" ? "Task Delay Report" : `Task Delay Report — ${session.name}`,
      generatedBy: session.name,
    });

    const buffer = await workbookToBuffer(workbook);
    return new NextResponse(toResponseBody(buffer), { headers: excelResponseHeaders(`task-delay-report-${Date.now()}.xlsx`) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
