import ExcelJS from "exceljs";
import { addReportHeader, styleHeaderRow } from "@/lib/excel/styles";
import { EXPENSE_STATUS_META } from "@/lib/constants";
import type { MonthlyExpense } from "@prisma/client";

type MonthlyExpenseWithCompany = MonthlyExpense & { company: { name: string } };

const COLUMNS = [
  { header: "Expense Name", key: "name", width: 28 },
  { header: "Company", key: "company", width: 22 },
  { header: "Due Date", key: "dueDate", width: 14 },
  { header: "Amount", key: "amount", width: 14 },
  { header: "Status", key: "status", width: 12 },
  { header: "Paid Date", key: "paidDate", width: 14 },
  { header: "Recurring", key: "isRecurring", width: 12 },
  { header: "Remarks", key: "remarks", width: 30 },
];

export function addExpenseSheet(
  workbook: ExcelJS.Workbook,
  expenses: MonthlyExpenseWithCompany[],
  options: { title: string; generatedBy: string },
) {
  const worksheet = workbook.addWorksheet("Monthly Expenses", { views: [{ state: "frozen", ySplit: 5 }] });
  worksheet.columns = COLUMNS;

  addReportHeader(worksheet, options.title, options.generatedBy, COLUMNS.length);

  const headerRow = worksheet.addRow(COLUMNS.map((c) => c.header));
  styleHeaderRow(headerRow);

  expenses.forEach((expense) => {
    const excelRow = worksheet.addRow({
      name: expense.name,
      company: expense.company.name,
      dueDate: expense.dueDate,
      amount: expense.amount,
      status: EXPENSE_STATUS_META[expense.status as "PAID" | "UNPAID"]?.label ?? expense.status,
      paidDate: expense.paidDate,
      isRecurring: expense.isRecurring ? "Yes" : "No",
      remarks: expense.remarks ?? "",
    });
    excelRow.getCell("dueDate").numFmt = "dd mmm yyyy";
    excelRow.getCell("paidDate").numFmt = "dd mmm yyyy";
    excelRow.getCell("amount").numFmt = "#,##0";

    if (expense.status === "PAID") {
      excelRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } } as never;
      });
    }
  });

  worksheet.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: headerRow.number, column: COLUMNS.length } };

  return worksheet;
}
