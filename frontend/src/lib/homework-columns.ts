import { deadlineDate, localIsoDate } from "./dates";
import { WEEK_DAYS, addDays, formatDayCaption } from "./week";

export type HomeworkColumnKey = "overdue" | "today" | "tomorrow" | "later";

export type HomeworkColumn = {
  key: HomeworkColumnKey;
  title: string;
  caption: string;
};

export type CalendarDayColumn = {
  date: string;
  dayName: string;
  title: string;
  caption: string;
  isToday: boolean;
};

export type HomeworkViewMode = "timeline" | "days";

export function buildHomeworkColumns(today: Date): HomeworkColumn[] {
  return [
    { key: "overdue", title: "Просрочено", caption: "Срок уже прошёл" },
    { key: "today", title: "Сегодня", caption: formatDayCaption(today) },
    {
      key: "tomorrow",
      title: "Завтра",
      caption: formatDayCaption(addDays(today, 1)),
    },
    { key: "later", title: "Позже", caption: "Следующие дни" },
  ];
}

export function columnKeyForDeadline(
  deadline: string,
  today: Date,
): HomeworkColumnKey {
  const date = deadlineDate(deadline);
  const todayIso = localIsoDate(today);
  if (date < todayIso) {
    return "overdue";
  }
  if (date === todayIso) {
    return "today";
  }
  if (date === localIsoDate(addDays(today, 1))) {
    return "tomorrow";
  }
  return "later";
}

/**
 * Return Monday of the week containing the given reference date (at 00:00:00).
 * Handles week starting on Monday (Russian calendar convention).
 */
export function getWeekMonday(reference: Date): Date {
  const d = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  const day = (d.getDay() + 6) % 7; // Monday is 0, Sunday is 6
  d.setDate(d.getDate() - day);
  return d;
}

/**
 * Build 7 columns (Monday through Sunday) for the calendar week starting at `monday`.
 */
export function buildCalendarWeekColumns(
  monday: Date,
  today: Date = new Date(),
): CalendarDayColumn[] {
  const todayIso = localIsoDate(today);
  return WEEK_DAYS.map((dayName, idx) => {
    const dayDate = addDays(monday, idx);
    const dateIso = localIsoDate(dayDate);
    return {
      date: dateIso,
      dayName,
      title: dayName,
      caption: formatDayCaption(dayDate),
      isToday: dateIso === todayIso,
    };
  });
}
