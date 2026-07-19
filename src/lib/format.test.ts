import { describe, it, expect } from "vitest";
import { formatDate, toDateInputValue, initials } from "@/lib/format";

describe("formatDate", () => {
  it("formats a date as 'dd MMM yyyy'", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05 Jan 2026");
  });

  it("returns an em dash for null/undefined", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});

describe("toDateInputValue", () => {
  it("formats a date as yyyy-MM-dd for <input type=date>", () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("returns an empty string for null/undefined", () => {
    expect(toDateInputValue(null)).toBe("");
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
