import ExcelJS from "exceljs";
import { addReportHeader, applyPriorityFill, styleHeaderRow } from "@/lib/excel/styles";
import { PRIORITY_META, STATUS_META, type TaskPriority, type TaskStatus } from "@/lib/constants";
import { formatTaskNumber } from "@/lib/task-number";
import { calculateDelayDays } from "@/lib/delay";

export interface ExportableTask {
  id: number;
  title: string;
  priority: string;
  status: string;
  assignedDate: Date;
  dueDate: Date;
  completedDate: Date | null;
  progressPercent: number;
  estimatedHours: number | null;
  actualHours: number | null;
  remarks: string | null;
  assignedTo: { name: string; employeeCode: string };
  company: { name: string };
  department: { name: string };
  category: { name: string } | null;
}

const COLUMNS = [
  { header: "Task ID", key: "taskId", width: 12 },
  { header: "Task Name", key: "title", width: 38 },
  { header: "Employee", key: "employee", width: 20 },
  { header: "Emp. Code", key: "employeeCode", width: 12 },
  { header: "Company", key: "company", width: 18 },
  { header: "Department", key: "department", width: 16 },
  { header: "Category", key: "category", width: 16 },
  { header: "Priority", key: "priority", width: 14 },
  { header: "Status", key: "status", width: 18 },
  { header: "Assigned Date", key: "assignedDate", width: 14 },
  { header: "Due Date", key: "dueDate", width: 14 },
  { header: "Completed Date", key: "completedDate", width: 15 },
  { header: "Delay (days)", key: "delay", width: 12 },
  { header: "Progress %", key: "progress", width: 11 },
  { header: "Est. Hours", key: "estimatedHours", width: 10 },
  { header: "Actual Hours", key: "actualHours", width: 11 },
  { header: "Remarks", key: "remarks", width: 30 },
];

export function addTaskListSheet(
  workbook: ExcelJS.Workbook,
  tasks: ExportableTask[],
  options: { sheetName?: string; title: string; generatedBy: string },
) {
  const worksheet = workbook.addWorksheet(options.sheetName ?? "Tasks", {
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
      taskId: formatTaskNumber(task.id),
      title: task.title,
      employee: task.assignedTo.name,
      employeeCode: task.assignedTo.employeeCode,
      company: task.company.name,
      department: task.department.name,
      category: task.category?.name ?? "—",
      priority: PRIORITY_META[task.priority as TaskPriority].label,
      status: STATUS_META[task.status as TaskStatus].label,
      assignedDate: task.assignedDate.toLocaleDateString("en-IN"),
      dueDate: task.dueDate.toLocaleDateString("en-IN"),
      completedDate: task.completedDate ? task.completedDate.toLocaleDateString("en-IN") : "—",
      delay: delay > 0 ? delay : "—",
      progress: `${task.progressPercent}%`,
      estimatedHours: task.estimatedHours ?? "—",
      actualHours: task.actualHours ?? "—",
      remarks: task.remarks ?? "",
    });
    applyPriorityFill(worksheet, row.number, "H", task.priority as TaskPriority);
    if (delay > 0) {
      worksheet.getCell(`M${row.number}`).font = { color: { argb: "FFDC2626" }, bold: true } as never;
    }
  });

  worksheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: COLUMNS.length },
  };

  return worksheet;
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// Next.js 16's DOM lib typings are stricter about ArrayBuffer vs SharedArrayBuffer than
// ExcelJS's/Node's Buffer typings account for; the value is a perfectly valid Response body
// at runtime, so this narrows the type rather than fighting the lib.dom generics.
export function toResponseBody(buffer: Buffer): BodyInit {
  return buffer as unknown as BodyInit;
}

export function excelResponseHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}
