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

const WEEKDAY_DATES: Record<string, string> = {
  понедельник: "2026-10-19",
  пн: "2026-10-19",
  вторник: "2026-10-20",
  вт: "2026-10-20",
  среда: "2026-10-21",
  среду: "2026-10-21",
  ср: "2026-10-21",
  четверг: "2026-10-15",
  четвергу: "2026-10-15",
  чт: "2026-10-15",
  пятниц: "2026-10-16",
  пятнице: "2026-10-16",
  пт: "2026-10-16",
  суббот: "2026-10-17",
  субботе: "2026-10-17",
  сб: "2026-10-17",
  сегодня: "2026-10-15",
  завтра: "2026-10-16",
};

export function parseHomeworkPrompt(
  prompt: string,
  availableLessons: Lesson[],
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
    for (const [key, dateVal] of Object.entries(WEEKDAY_DATES)) {
      if (normalized.includes(key)) {
        dueDate = dateVal;
        break;
      }
    }
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
