import ExcelJS from "exceljs";
import { addReportHeader, styleHeaderRow } from "@/lib/excel/styles";
import { UNBILLED_ENTRY_STATUS_META } from "@/lib/constants";
import type { UnbilledEntry } from "@prisma/client";

type UnbilledEntryWithCompany = UnbilledEntry & { company: { name: string } };

const COLUMNS = [
  { header: "Description", key: "description", width: 32 },
  { header: "Company", key: "company", width: 22 },
  { header: "Expected Date", key: "expectedDate", width: 14 },
  { header: "Expected Amount", key: "expectedAmount", width: 16 },
  { header: "Status", key: "status", width: 12 },
  { header: "Entry Done Date", key: "entryDoneDate", width: 16 },
  { header: "Recurring", key: "isRecurring", width: 12 },
  { header: "Remarks", key: "remarks", width: 30 },
];

export function addUnbilledEntrySheet(
  workbook: ExcelJS.Workbook,
  entries: UnbilledEntryWithCompany[],
  options: { title: string; generatedBy: string },
) {
  const worksheet = workbook.addWorksheet("Monthly Unbilled Entries", { views: [{ state: "frozen", ySplit: 5 }] });
  worksheet.columns = COLUMNS;

  addReportHeader(worksheet, options.title, options.generatedBy, COLUMNS.length);

  const headerRow = worksheet.addRow(COLUMNS.map((c) => c.header));
  styleHeaderRow(headerRow);

  entries.forEach((entry) => {
    const excelRow = worksheet.addRow({
      description: entry.description,
      company: entry.company.name,
      expectedDate: entry.expectedDate,
      expectedAmount: entry.expectedAmount,
      status: UNBILLED_ENTRY_STATUS_META[entry.status as "PENDING" | "DONE"]?.label ?? entry.status,
      entryDoneDate: entry.entryDoneDate,
      isRecurring: entry.isRecurring ? "Yes" : "No",
      remarks: entry.remarks ?? "",
    });
    excelRow.getCell("expectedDate").numFmt = "dd mmm yyyy";
    excelRow.getCell("entryDoneDate").numFmt = "dd mmm yyyy";
    excelRow.getCell("expectedAmount").numFmt = "#,##0";

    if (entry.status === "DONE") {
      excelRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } } as never;
      });
    }
  });

  worksheet.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: headerRow.number, column: COLUMNS.length } };

  return worksheet;
}
