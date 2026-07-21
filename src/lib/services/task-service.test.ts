import { describe, it, expect } from "vitest";
import { getGroupSummary } from "@/lib/services/task-service";

describe("getGroupSummary", () => {
  it("labels the group Completed when every assignee is done", () => {
    const summary = getGroupSummary([{ status: "COMPLETED" }, { status: "COMPLETED" }]);
    expect(summary).toEqual({ total: 2, completedCount: 2, label: "Completed" });
  });

  it("labels the group Partially Completed when some but not all are done", () => {
    const summary = getGroupSummary([{ status: "COMPLETED" }, { status: "PENDING" }, { status: "IN_PROGRESS" }]);
    expect(summary).toEqual({ total: 3, completedCount: 1, label: "Partially Completed" });
  });

  it("labels the group Pending when nobody is done yet", () => {
    const summary = getGroupSummary([{ status: "PENDING" }, { status: "IN_PROGRESS" }]);
    expect(summary).toEqual({ total: 2, completedCount: 0, label: "Pending" });
  });

  it("labels a single-task 'group' the same way (no siblings)", () => {
    expect(getGroupSummary([{ status: "COMPLETED" }])).toEqual({ total: 1, completedCount: 1, label: "Completed" });
    expect(getGroupSummary([{ status: "PENDING" }])).toEqual({ total: 1, completedCount: 0, label: "Pending" });
  });
});
