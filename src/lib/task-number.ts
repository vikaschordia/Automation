export function formatTaskNumber(id: number): string {
  return `TSK-${id.toString().padStart(6, "0")}`;
}
