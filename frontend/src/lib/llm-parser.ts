import type { HomeworkDraft, Lesson, Subgroup } from "./types";

export type ParsedHomeworkResult = HomeworkDraft & {
  subject: string;
};

const SUBJECT_ALIASES: Array<{ keywords: string[]; lessonSubject: string }> = [
  {
    keywords: ["матан", "математик", "матанализ"],
    lessonSubject: "Математический анализ",
  },
  {
    keywords: ["питон", "python", "пайтон"],
    lessonSubject: "Программирование на Python",
  },
  {
    keywords: ["алгоритм", "структур", "аисд"],
    lessonSubject: "Алгоритмы и структуры данных",
  },
  {
    keywords: ["англ", "english", "инглиш"],
    lessonSubject: "Английский язык",
  },
  {
    keywords: ["дискрет", "кнф", "днф"],
    lessonSubject: "Дискретная математика",
  },
  {
    keywords: ["истор"],
    lessonSubject: "История России",
  },
];

const RUSSIAN_WEEKDAYS: Record<string, number> = {
  понедельник: 1,
  пн: 1,
  вторник: 2,
  вт: 2,
  среда: 3,
  среду: 3,
  ср: 3,
  четверг: 4,
  четвергу: 4,
  чт: 4,
  пятниц: 5,
  пятнице: 5,
  пт: 5,
  суббот: 6,
  субботе: 6,
  сб: 6,
  воскресень: 0,
  вс: 0,
};

function formatISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveTargetDate(
  keyword: string,
  availableLessons: Lesson[],
  baseDate: Date = new Date(),
): string | undefined {
  const norm = keyword.toLowerCase();

  if (norm.includes("сегодня")) {
    const todayLesson = availableLessons.find((l) =>
      l.dayLabel?.toLowerCase().includes("сегодня"),
    );
    if (todayLesson?.date) {
      return todayLesson.date;
    }
    return formatISODate(baseDate);
  }

  if (norm.includes("завтра")) {
    const tomorrowLesson = availableLessons.find((l) =>
      l.dayLabel?.toLowerCase().includes("завтра"),
    );
    if (tomorrowLesson?.date) {
      return tomorrowLesson.date;
    }
    const tomorrow = new Date(baseDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatISODate(tomorrow);
  }

  for (const [wName, targetDayNum] of Object.entries(RUSSIAN_WEEKDAYS)) {
    if (norm.includes(wName)) {
      const lessonOnDay = availableLessons.find((l) => {
        const d = new Date(l.date);
        return !isNaN(d.getTime()) && d.getDay() === targetDayNum;
      });
      if (lessonOnDay?.date) {
        return lessonOnDay.date;
      }

      const nextDate = new Date(baseDate);
      const currentDay = nextDate.getDay();
      let diff = targetDayNum - currentDay;
      if (diff <= 0) {
        diff += 7;
      }
      nextDate.setDate(nextDate.getDate() + diff);
      return formatISODate(nextDate);
    }
  }

  return undefined;
}

export function parseHomeworkPrompt(
  prompt: string,
  availableLessons: Lesson[],
  baseDate?: Date,
): ParsedHomeworkResult {
  const normalized = prompt.toLowerCase();

  let matchedLesson: Lesson | undefined;

  for (const entry of SUBJECT_ALIASES) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      matchedLesson = availableLessons.find(
        (lesson) => lesson.subject === entry.lessonSubject,
      );
      if (matchedLesson) {
        break;
      }
    }
  }

  if (!matchedLesson) {
    matchedLesson =
      availableLessons.find((lesson) =>
        normalized.includes(lesson.subject.toLowerCase()),
      ) ?? availableLessons[0];
  }

  let subgroup: Subgroup | "all" = matchedLesson.subgroup;
  if (/(\b1\s*подгрупп|подгрупп[а-я]*\s*1|перв[а-я]*\s*подгрупп)/i.test(normalized)) {
    subgroup = 1;
  } else if (/(\b2\s*подгрупп|подгрупп[а-я]*\s*2|втор[а-я]*\s*подгрупп)/i.test(normalized)) {
    subgroup = 2;
  } else if (/(вся\s*групп|для\s*всех)/i.test(normalized)) {
    subgroup = "all";
  }

  let dueDate: string | undefined;

  const isoMatch = normalized.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) {
    dueDate = isoMatch[0];
  } else {
    dueDate = resolveTargetDate(normalized, availableLessons, baseDate);
  }

  if (!dueDate) {
    dueDate = matchedLesson.date;
  }

  let cleaned = prompt
    .replace(/(?:для\s*)?(?:[12]\s*подгрупп[а-я]*|вся\s*группа|для\s*всех)/gi, "")
    .replace(/(?:по\s*)?(?:матану?|математике?|питону?|python|алгоритмам?|аисд|английскому?|english|дискретной\s*математике?|дискретке?|истории?)/gi, "")
    .replace(/(?:к|на)\s*(?:четвергу?|пятнице?|субботе?|понедельнику?|вторнику?|среде?|завтра|сегодня|\d{4}-\d{2}-\d{2})/gi, "")
    .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "")
    .trim();

  if (cleaned.length < 4) {
    cleaned = prompt.trim();
  }

  return {
    lessonId: matchedLesson.id,
    subject: matchedLesson.subject,
    subgroup,
    dueDate,
    description: cleaned,
  };
}
