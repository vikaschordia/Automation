import { describe, it, expect } from "vitest";
import { calculateDelayDays, isOverdue, isDueToday, isDueTomorrow } from "@/lib/delay";

const today = new Date(2026, 5, 15); // 15 Jun 2026, fixed reference point

describe("calculateDelayDays", () => {
  it("is 0 when completed on the due date", () => {
    const due = new Date(2026, 5, 10);
    const completed = new Date(2026, 5, 10);
    expect(calculateDelayDays(due, completed)).toBe(0);
  });

  it("is completedDate - dueDate when completed after the due date", () => {
    const due = new Date(2026, 5, 10);
    const completed = new Date(2026, 5, 14);
    expect(calculateDelayDays(due, completed)).toBe(4);
  });

  it("is 0 when completed before the due date (early completion)", () => {
    const due = new Date(2026, 5, 10);
    const completed = new Date(2026, 5, 8);
    expect(calculateDelayDays(due, completed)).toBe(0);
  });

  it("is today - dueDate when not completed and overdue", () => {
    const due = new Date(2026, 5, 10);
    expect(calculateDelayDays(due, null, today)).toBe(5);
  });

  it("is 0 when not completed and due date has not passed", () => {
    const due = new Date(2026, 5, 20);
    expect(calculateDelayDays(due, null, today)).toBe(0);
  });

  it("is 0 when the due date is today and not yet completed", () => {
    const due = new Date(2026, 5, 15);
    expect(calculateDelayDays(due, null, today)).toBe(0);
  });
});

describe("isOverdue", () => {
  it("is true for a past due date with no completion", () => {
    expect(isOverdue(new Date(2026, 5, 10), null, today)).toBe(true);
  });

  it("is false once the task has a completedDate, no matter how late", () => {
    expect(isOverdue(new Date(2026, 5, 1), new Date(2026, 5, 20), today)).toBe(false);
  });

  it("is false for a future due date", () => {
    expect(isOverdue(new Date(2026, 5, 20), null, today)).toBe(false);
  });
});

describe("isDueToday / isDueTomorrow", () => {
  it("flags a due date matching today", () => {
    expect(isDueToday(new Date(2026, 5, 15), today)).toBe(true);
    expect(isDueToday(new Date(2026, 5, 16), today)).toBe(false);
  });

  it("flags a due date matching tomorrow", () => {
    expect(isDueTomorrow(new Date(2026, 5, 16), today)).toBe(true);
    expect(isDueTomorrow(new Date(2026, 5, 15), today)).toBe(false);
  });
});
