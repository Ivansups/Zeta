/** Calendar helpers: no demo data, only real dates. */

export const WEEK_DAYS = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
] as const;

const SHORT_WEEK_DAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

export function currentDayName(date: Date): string {
  return WEEK_DAYS[(date.getDay() + 6) % 7];
}

export function shortDayName(date: Date): string {
  return SHORT_WEEK_DAYS[date.getDay()];
}

export function formatDayCaption(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function currentSemesterLabel(date: Date): string {
  const month = date.getMonth();
  return month >= 7 || month === 0 ? "Осенний семестр" : "Весенний семестр";
}

export function currentStudyWeek(date: Date): number {
  const semesterStartYear = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  const start = new Date(semesterStartYear, 8, 1);
  const elapsedDays = Math.floor(
    (date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  return Math.max(1, Math.floor(elapsedDays / 7) + 1);
}
