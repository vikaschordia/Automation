import { describe, it, expect } from "vitest";
import { formatTaskNumber } from "@/lib/task-number";

describe("formatTaskNumber", () => {
  it("pads small ids to 6 digits with a TSK- prefix", () => {
    expect(formatTaskNumber(1)).toBe("TSK-000001");
    expect(formatTaskNumber(42)).toBe("TSK-000042");
  });

  it("does not truncate ids longer than 6 digits", () => {
    expect(formatTaskNumber(1234567)).toBe("TSK-1234567");
  });
});
