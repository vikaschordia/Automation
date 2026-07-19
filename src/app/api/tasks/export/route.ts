import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { buildTaskWhere, taskInclude } from "@/lib/services/task-service";
import { addTaskListSheet, excelResponseHeaders, toResponseBody, workbookToBuffer } from "@/lib/excel/task-list-sheet";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const where = buildTaskWhere(request.nextUrl.searchParams, session);

    const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy: { dueDate: "asc" } });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Daily Task Tracker";
    workbook.created = new Date();

    addTaskListSheet(workbook, tasks, {
      title: session.role === "ADMIN" ? "Task Export" : `Tasks — ${session.name}`,
      generatedBy: session.name,
    });

    const buffer = await workbookToBuffer(workbook);
    return new NextResponse(toResponseBody(buffer), { headers: excelResponseHeaders(`tasks-export-${Date.now()}.xlsx`) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
