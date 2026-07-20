import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatRelative, toDateInputValue, initials } from "@/lib/format";

describe("formatDate", () => {
  it("formats a date as 'dd MMM yyyy'", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05 Jan 2026");
  });

  it("returns an em dash for null/undefined", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("regression: returns an em dash instead of throwing for an Invalid Date", () => {
    // new Date("") / new Date("not a date") don't throw — they produce an Invalid Date (getTime()
    // is NaN). date-fns' format() DOES throw on those. This is exactly what a date <input> sends
    // via onChange while a user is mid-typing a value manually (as opposed to picking one off the
    // calendar, which always lands on a complete value), so every formatter here must tolerate it.
    expect(() => formatDate(new Date(""))).not.toThrow();
    expect(formatDate(new Date(""))).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("formatDateTime / formatRelative", () => {
  it("also tolerate an Invalid Date without throwing", () => {
    expect(() => formatDateTime(new Date(""))).not.toThrow();
    expect(formatDateTime(new Date(""))).toBe("—");
    expect(() => formatRelative(new Date(""))).not.toThrow();
    expect(formatRelative(new Date(""))).toBe("—");
  });
});

describe("toDateInputValue", () => {
  it("formats a date as yyyy-MM-dd for <input type=date>", () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("returns an empty string for null/undefined", () => {
    expect(toDateInputValue(null)).toBe("");
  });

  it("regression: returns an empty string instead of throwing for an Invalid Date", () => {
    expect(() => toDateInputValue(new Date(""))).not.toThrow();
    expect(toDateInputValue(new Date(""))).toBe("");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Rohit Sharma")).toBe("RS");
  });

  it("handles a single-word name", () => {
    expect(initials("Admin")).toBe("A");
  });

  it("ignores extra whitespace", () => {
    expect(initials("  Priya   Nair  ")).toBe("PN");
  });
});
