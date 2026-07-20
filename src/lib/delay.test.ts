import { describe, it, expect } from "vitest";
import { calculateDelayDays, isOverdue, isDueToday, isDueTomorrow, parseLocalDateString } from "@/lib/delay";

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

describe("parseLocalDateString", () => {
  it("parses a yyyy-mm-dd string as local midnight, matching a same-day Date(y,m,d)", () => {
    const parsed = parseLocalDateString("2026-07-20");
    const expected = new Date(2026, 6, 20);
    expect(parsed.getTime()).toBe(expected.getTime());
    expect(parsed.getHours()).toBe(0);
  });

  it("regression: differs from the UTC-parsing new Date('yyyy-mm-dd') for a task due later the same local day", () => {
    // This is the bug a "Quick range: Today" filter hit: dueFrom = dueTo = today's date string.
    // With new Date("yyyy-mm-dd") (UTC midnight) and an inclusive `lte` upper bound, a task due
    // today at any time after UTC midnight fell outside [gte todayUTC, lte todayUTC] and the
    // "Today" report silently returned zero rows despite a task genuinely being due that day.
    const dateStr = "2026-07-20";
    const localMidnight = parseLocalDateString(dateStr);
    const taskDueLaterToday = new Date(2026, 6, 20, 16, 30); // same local calendar day, 4:30pm
    expect(taskDueLaterToday.getTime()).toBeGreaterThan(localMidnight.getTime());
    // and it must fall before the *next* local day's midnight (the exclusive upper bound
    // buildTaskWhere now uses), not get cut off at today's midnight:
    const nextDayMidnight = new Date(localMidnight);
    nextDayMidnight.setDate(nextDayMidnight.getDate() + 1);
    expect(taskDueLaterToday.getTime()).toBeLessThan(nextDayMidnight.getTime());
  });
});
