import { formatDayCaption } from "./week";

/** Homework deadlines are calendar dates; keep them timezone-stable. */

export function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function deadlineDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function deadlineToIso(date: string | null | undefined): string | null {
  if (!date) return null;
  return `${date}T12:00:00Z`;
}

export function formatDeadline(iso: string | null | undefined): string {
  if (!iso) return "Без дедлайна";
  const str = deadlineDate(iso);
  if (!str) return "Без дедлайна";
  const [year, month, day] = str.split("-").map(Number);
  return formatDayCaption(new Date(year, month - 1, day));
}
