import { buildDateOptions, formatDate } from "./date";

describe("buildDateOptions", () => {
  it("builds consecutive dates across month boundaries", () => {
    expect(buildDateOptions("2026-11-29", 3)).toEqual([
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
    ]);
  });
});

describe("formatDate", () => {
  it("formats an ISO date for display", () => {
    expect(formatDate("2026-11-01")).toBe("01.11");
  });
});
