import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { assertUnbilledEntryAccess } from "@/lib/rbac";
import { listUnbilledEntries } from "@/lib/services/unbilled-entry-service";
import { addUnbilledEntrySheet } from "@/lib/excel/unbilled-entry-sheet";
import { excelResponseHeaders, toResponseBody, workbookToBuffer } from "@/lib/excel/task-list-sheet";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await assertUnbilledEntryAccess(session);
    const now = new Date();
    const year = Number(request.nextUrl.searchParams.get("year")) || now.getFullYear();
    const month = Number(request.nextUrl.searchParams.get("month")) || now.getMonth() + 1;

    const entries = await listUnbilledEntries(year, month);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Daily Task Tracker";
    workbook.created = new Date();

    addUnbilledEntrySheet(workbook, entries, {
      title: `Monthly Unbilled Entries — ${MONTH_NAMES[month - 1]} ${year}`,
      generatedBy: session.name,
    });

    const buffer = await workbookToBuffer(workbook);
    return new NextResponse(toResponseBody(buffer), {
      headers: excelResponseHeaders(`unbilled-entries-${year}-${String(month).padStart(2, "0")}.xlsx`),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
