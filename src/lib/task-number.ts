export function formatTaskNumber(taskNumber: number): string {
  return `TSK-${taskNumber.toString().padStart(6, "0")}`;
}
