import ExcelJS from "exceljs";
import { addReportHeader, applyPriorityFill, styleHeaderRow } from "@/lib/excel/styles";
import { PRIORITY_META, STATUS_META, type TaskPriority, type TaskStatus } from "@/lib/constants";
import { formatTaskNumber } from "@/lib/task-number";
import { calculateDelayDays } from "@/lib/delay";
import type { ExportableTask } from "@/lib/excel/task-list-sheet";

// Fixed column set/order requested for the Task Delay Report — Employee, Company, Task ID, Task
// Name, Priority, Status, Assigned Date, Due Date, Completed Date, Delay (days), Remarks. Keep
// this distinct from task-list-sheet.ts's broader export (which also has Department/Category/
// Progress/Hours) rather than parameterizing one builder for both — the column sets are curated
// for different audiences, and a shared builder would need a growing set of "hide this column"
// flags for no real benefit.
const COLUMNS = [
  { header: "Employee", key: "employee", width: 20 },
  { header: "Company", key: "company", width: 20 },
  { header: "Task ID", key: "taskId", width: 12 },
  { header: "Task Name", key: "title", width: 38 },
  { header: "Priority", key: "priority", width: 14 },
  { header: "Status", key: "status", width: 18 },
  { header: "Assigned Date", key: "assignedDate", width: 14 },
  { header: "Due Date", key: "dueDate", width: 14 },
  { header: "Completed Date", key: "completedDate", width: 15 },
  { header: "Delay (days)", key: "delay", width: 12 },
  { header: "Remarks", key: "remarks", width: 32 },
];

const PRIORITY_COLUMN_LETTER = "E";
const DELAY_COLUMN_LETTER = "J";

export function addTaskDelayReportSheet(
  workbook: ExcelJS.Workbook,
  tasks: ExportableTask[],
  options: { sheetName?: string; title: string; generatedBy: string },
) {
  const worksheet = workbook.addWorksheet(options.sheetName ?? "Task Delay Report", {
    views: [{ state: "frozen", ySplit: 5 }],
  });
  worksheet.columns = COLUMNS;

  addReportHeader(worksheet, options.title, options.generatedBy, COLUMNS.length);

  const headerRow = worksheet.addRow(COLUMNS.map((c) => c.header));
  styleHeaderRow(headerRow);
  const headerRowNumber = headerRow.number;

  tasks.forEach((task) => {
    const delay = calculateDelayDays(task.dueDate, task.completedDate);
    const row = worksheet.addRow({
      employee: task.assignedTo.name,
      company: task.company.name,
      taskId: formatTaskNumber(task.taskNumber),
      title: task.title,
      priority: PRIORITY_META[task.priority as TaskPriority].label,
      status: STATUS_META[task.status as TaskStatus].label,
      assignedDate: task.assignedDate.toLocaleDateString("en-IN"),
      dueDate: task.dueDate.toLocaleDateString("en-IN"),
      completedDate: task.completedDate ? task.completedDate.toLocaleDateString("en-IN") : "—",
      delay: delay > 0 ? delay : "—",
      remarks: task.remarks ?? "",
    });
    applyPriorityFill(worksheet, row.number, PRIORITY_COLUMN_LETTER, task.priority as TaskPriority);
    if (delay > 0) {
      worksheet.getCell(`${DELAY_COLUMN_LETTER}${row.number}`).font = { color: { argb: "FFDC2626" }, bold: true } as never;
    }
  });

  worksheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: COLUMNS.length },
  };

  return worksheet;
}
