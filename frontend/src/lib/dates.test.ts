import {
  deadlineDate,
  deadlineToIso,
  formatDeadline,
  localIsoDate,
} from "./dates";

describe("deadline helpers", () => {
  it("keeps the calendar date of a legacy 23:59Z deadline", () => {
    expect(deadlineDate("2026-11-23T23:59:00Z")).toBe("2026-11-23");
    expect(formatDeadline("2026-11-23T23:59:00Z")).toBe("23 ноября");
  });

  it("stores the picked date as a stable midday UTC deadline", () => {
    expect(deadlineToIso("2026-11-25")).toBe("2026-11-25T12:00:00Z");
    expect(deadlineDate(deadlineToIso("2026-11-25"))).toBe("2026-11-25");
  });

  it("formats local dates without a UTC shift", () => {
    expect(localIsoDate(new Date(2026, 10, 21, 0, 30))).toBe("2026-11-21");
    expect(localIsoDate(new Date(2026, 10, 21, 23, 30))).toBe("2026-11-21");
  });
});
