import { buildDateOptions } from "../lib/date";
import type { SchedulePair } from "../types";

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const [today, tomorrow] = buildDateOptions(todayIso(), 2);

/** Placeholder schedule until the schedule screen (#87) loads it from the API. */
export const samplePairs: SchedulePair[] = [
  {
    id: "pair-math",
    date: today,
    startTime: "09:00",
    endTime: "10:30",
    subject: "Математический анализ",
    subgroup: null,
    homeworks: [],
  },
  {
    id: "pair-python",
    date: today,
    startTime: "10:45",
    endTime: "12:15",
    subject: "Программирование на Python",
    subgroup: 1,
    homeworks: [],
  },
  {
    id: "pair-algorithms",
    date: tomorrow,
    startTime: "10:45",
    endTime: "12:15",
    subject: "Алгоритмы и структуры данных",
    subgroup: 2,
    homeworks: [],
  },
];
