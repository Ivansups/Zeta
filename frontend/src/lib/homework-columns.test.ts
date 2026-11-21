import {
  buildCalendarWeekColumns,
  buildHomeworkColumns,
  columnKeyForDeadline,
  getWeekMonday,
} from "./homework-columns";

const today = new Date(2026, 10, 21, 12, 0); // Saturday 21 Nov 2026

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

  describe("calendar mode columns", () => {
    it("finds Monday for any day of the week", () => {
      // 21 Nov 2026 is Saturday -> Monday is 16 Nov 2026
      const monday = getWeekMonday(today);
      expect(monday.getFullYear()).toBe(2026);
      expect(monday.getMonth()).toBe(10); // November
      expect(monday.getDate()).toBe(16);

      // Sunday 22 Nov 2026 -> Monday is still 16 Nov 2026
      const sunday = new Date(2026, 10, 22, 18, 0);
      expect(getWeekMonday(sunday).getDate()).toBe(16);

      // Monday 16 Nov 2026 -> Monday is 16 Nov 2026
      const mon = new Date(2026, 10, 16, 9, 0);
      expect(getWeekMonday(mon).getDate()).toBe(16);
    });

    it("builds 7 days Monday through Sunday with correct captions and isToday flag", () => {
      const monday = getWeekMonday(today);
      const columns = buildCalendarWeekColumns(monday, today);

      expect(columns).toHaveLength(7);
      expect(columns.map((c) => c.dayName)).toEqual([
        "Понедельник",
        "Вторник",
        "Среда",
        "Четверг",
        "Пятница",
        "Суббота",
        "Воскресенье",
      ]);
      expect(columns[0].date).toBe("2026-11-16");
      expect(columns[0].caption).toBe("16 ноября");
      expect(columns[0].isToday).toBe(false);

      // Saturday is index 5
      expect(columns[5].date).toBe("2026-11-21");
      expect(columns[5].caption).toBe("21 ноября");
      expect(columns[5].isToday).toBe(true);

      // Sunday is index 6
      expect(columns[6].date).toBe("2026-11-22");
      expect(columns[6].caption).toBe("22 ноября");
      expect(columns[6].isToday).toBe(false);
    });
  });
});
