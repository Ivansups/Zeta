import type { ApiSchedulePair } from "./api";

export type LessonKind = "Лекция" | "Практика" | "Лабораторная";

const KIND_MAP: Record<string, LessonKind> = {
  лек: "Лекция",
  прак: "Практика",
  лаб: "Лабораторная",
};

export function lessonKindOf(
  pair: ApiSchedulePair | null | undefined,
): LessonKind | null {
  if (!pair?.lesson_type) {
    return null;
  }
  return KIND_MAP[pair.lesson_type.toLowerCase()] ?? null;
}

export function lessonLocationOf(
  pair: ApiSchedulePair | null | undefined,
): string | null {
  if (!pair) {
    return null;
  }
  if (pair.room) {
    const trimmed = pair.room.trim();
    const lower = trimmed.toLowerCase();
    if (lower === "онлайн" || lower === "дистант" || lower === "online") {
      return "Онлайн";
    }
    if (lower.startsWith("ауд")) {
      return trimmed;
    }
    return `ауд. ${trimmed}`;
  }
  return pair.is_online ? "Онлайн" : null;
}

export type WeekParityFilter = "all" | "numerator" | "denominator";

export function pairMatchesParity(
  pair: ApiSchedulePair,
  parity: WeekParityFilter,
): boolean {
  if (parity === "all") {
    return true;
  }
  const value = (pair.week_parity ?? "").toLowerCase();
  if (value === "numerator" || value === "denominator") {
    return value === parity;
  }
  return true;
}
