import { describe, it, expect } from "vitest";
import { assertAdmin, assertTaskFieldsEditable, assertOwnsTask } from "@/lib/rbac";
import { ApiError } from "@/lib/session";

describe("assertAdmin", () => {
  it("passes silently for ADMIN", () => {
    expect(() => assertAdmin("ADMIN")).not.toThrow();
  });

  it("throws a 403 ApiError for EMPLOYEE", () => {
    try {
      assertAdmin("EMPLOYEE");
      throw new Error("expected assertAdmin to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(403);
    }
  });
});

describe("assertTaskFieldsEditable", () => {
  it("lets an ADMIN edit any field, including the ones restricted for employees", () => {
    expect(() => assertTaskFieldsEditable("ADMIN", ["priority", "dueDate", "assignedToId"])).not.toThrow();
  });

  it("lets an EMPLOYEE fully edit their own task (title, priority, dates, etc.)", () => {
    expect(() =>
      assertTaskFieldsEditable("EMPLOYEE", ["status", "progressPercent", "remarks", "priority", "dueDate", "title"]),
    ).not.toThrow();
  });

  it("blocks an EMPLOYEE from reassigning a task away from themselves", () => {
    expect(() => assertTaskFieldsEditable("EMPLOYEE", ["assignedToId"])).toThrow(ApiError);
    expect(() => assertTaskFieldsEditable("EMPLOYEE", ["additionalAssignedToIds"])).toThrow(ApiError);
  });

  it("blocks the whole patch if even one field is disallowed, not just the offending field", () => {
    try {
      assertTaskFieldsEditable("EMPLOYEE", ["status", "assignedToId"]);
      throw new Error("expected assertTaskFieldsEditable to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toContain("assignedToId");
    }
  });
});

describe("assertOwnsTask", () => {
  it("lets an ADMIN act on any task regardless of assignee", () => {
    expect(() => assertOwnsTask("ADMIN", null, "employee-123")).not.toThrow();
  });

  it("lets an EMPLOYEE act on their own task", () => {
    expect(() => assertOwnsTask("EMPLOYEE", "employee-123", "employee-123")).not.toThrow();
  });

  it("blocks an EMPLOYEE from acting on someone else's task", () => {
    expect(() => assertOwnsTask("EMPLOYEE", "employee-123", "employee-456")).toThrow(ApiError);
  });

  it("blocks an EMPLOYEE with no linked employee profile", () => {
    expect(() => assertOwnsTask("EMPLOYEE", null, "employee-456")).toThrow(ApiError);
  });
});
