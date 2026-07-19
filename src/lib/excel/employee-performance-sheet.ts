import ExcelJS from "exceljs";
import { addReportHeader, styleHeaderRow } from "@/lib/excel/styles";
import type { EmployeePerformanceRow } from "@/lib/services/report-service";

const COLUMNS = [
  { header: "Emp. Code", key: "employeeCode", width: 12 },
  { header: "Employee", key: "name", width: 20 },
  { header: "Designation", key: "designation", width: 20 },
  { header: "Company", key: "company", width: 18 },
  { header: "Department", key: "department", width: 16 },
  { header: "Total Tasks", key: "total", width: 12 },
  { header: "Completed", key: "completed", width: 12 },
  { header: "Pending", key: "pending", width: 10 },
  { header: "Delayed", key: "delayed", width: 10 },
  { header: "Avg Delay (d)", key: "avgDelayDays", width: 13 },
  { header: "Completion %", key: "completionPercent", width: 13 },
  { header: "Avg Completion (d)", key: "avgCompletionDays", width: 16 },
  { header: "P1 Urgent", key: "p1Count", width: 10 },
  { header: "P2 Medium", key: "p2Count", width: 10 },
  { header: "P3 Low", key: "p3Count", width: 10 },
];

export function addEmployeePerformanceSheet(
  workbook: ExcelJS.Workbook,
  rows: EmployeePerformanceRow[],
  options: { title: string; generatedBy: string },
) {
  const worksheet = workbook.addWorksheet("Employee Performance", { views: [{ state: "frozen", ySplit: 5 }] });
  worksheet.columns = COLUMNS;

  addReportHeader(worksheet, options.title, options.generatedBy, COLUMNS.length);

  const headerRow = worksheet.addRow(COLUMNS.map((c) => c.header));
  styleHeaderRow(headerRow);

  rows.forEach((row) => {
    const excelRow = worksheet.addRow({
      ...row,
      completionPercent: `${row.completionPercent}%`,
    });
    if (row.delayed > 0) {
      excelRow.getCell("delayed").font = { color: { argb: "FFDC2626" }, bold: true } as never;
    }
    if (row.completionPercent >= 75) {
      excelRow.getCell("completionPercent").font = { color: { argb: "FF16A34A" }, bold: true } as never;
    }
  });

  worksheet.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: headerRow.number, column: COLUMNS.length } };

  return worksheet;
}
