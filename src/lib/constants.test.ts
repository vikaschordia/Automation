import { describe, it, expect } from "vitest";
import { TASK_PRIORITIES, TASK_STATUSES, PRIORITY_META, STATUS_META } from "@/lib/constants";

// A "contract" test: every place that renders a priority/status badge or an Excel cell looks
// values up by key with no fallback, so a renamed/added enum value with no matching metadata
// would throw at render time instead of at build time. This test catches that at build time.
describe("priority/status metadata is complete", () => {
  it("has PRIORITY_META for every TASK_PRIORITIES value", () => {
    for (const priority of TASK_PRIORITIES) {
      expect(PRIORITY_META[priority]).toBeDefined();
      expect(PRIORITY_META[priority].label).toBeTruthy();
      expect(PRIORITY_META[priority].excelArgb).toMatch(/^FF[0-9A-F]{6}$/);
    }
  });

  it("has STATUS_META for every TASK_STATUSES value", () => {
    for (const status of TASK_STATUSES) {
      expect(STATUS_META[status]).toBeDefined();
      expect(STATUS_META[status].label).toBeTruthy();
    }
  });
});
