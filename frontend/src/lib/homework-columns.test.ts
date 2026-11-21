import { buildHomeworkColumns, columnKeyForDeadline } from "./homework-columns";

const today = new Date(2026, 10, 21, 12, 0);

describe("homework board columns", () => {
  it("builds overdue, today, tomorrow and later columns", () => {
    expect(buildHomeworkColumns(today).map((column) => column.title)).toEqual([
      "Просрочено",
      "Сегодня",
      "Завтра",
      "Позже",
    ]);
  });

  it("buckets deadlines by calendar date", () => {
    expect(columnKeyForDeadline("2026-11-20T23:59:00Z", today)).toBe("overdue");
    expect(columnKeyForDeadline("2026-11-21T23:59:00Z", today)).toBe("today");
    expect(columnKeyForDeadline("2026-11-22T12:00:00Z", today)).toBe("tomorrow");
    expect(columnKeyForDeadline("2026-12-30T12:00:00Z", today)).toBe("later");
  });
});
