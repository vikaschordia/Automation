import type { Worksheet, Row } from "exceljs";
import { PRIORITY_META, type TaskPriority } from "@/lib/constants";

export const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } } as const;
export const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 } as const;
export const TITLE_FONT = { bold: true, size: 16, color: { argb: "FF1D4ED8" } } as const;
export const SUBTITLE_FONT = { italic: true, size: 10, color: { argb: "FF6B7280" } } as const;

export function styleHeaderRow(row: Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL as never;
    cell.font = HEADER_FONT as never;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD1D5DB" } } };
  });
  row.height = 22;
}

export function applyPriorityFill(worksheet: Worksheet, rowNumber: number, columnKey: string, priority: TaskPriority) {
  const cell = worksheet.getCell(`${columnKey}${rowNumber}`);
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIORITY_META[priority].excelArgb } } as never;
  cell.alignment = { vertical: "middle", horizontal: "center" };
}

export function addReportHeader(worksheet: Worksheet, title: string, generatedBy: string, columnCount: number) {
  worksheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = "Daily Task Tracker";
  titleCell.font = TITLE_FONT as never;
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(1).height = 26;

  worksheet.mergeCells(2, 1, 2, columnCount);
  const subtitleCell = worksheet.getCell(2, 1);
  subtitleCell.value = title;
  subtitleCell.font = { bold: true, size: 12 } as never;

  worksheet.mergeCells(3, 1, 3, columnCount);
  const metaCell = worksheet.getCell(3, 1);
  metaCell.value = `Generated ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} by ${generatedBy}`;
  metaCell.font = SUBTITLE_FONT as never;
  worksheet.getRow(3).height = 16;

  worksheet.addRow([]);
}
