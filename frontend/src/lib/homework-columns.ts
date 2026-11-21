import { deadlineDate, localIsoDate } from "./dates";
import { addDays, formatDayCaption } from "./week";

export type HomeworkColumnKey = "overdue" | "today" | "tomorrow" | "later";

export type HomeworkColumn = {
  key: HomeworkColumnKey;
  title: string;
  caption: string;
};

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
