import { lessons } from "./mock-data";
import { parseHomeworkPrompt } from "./llm-parser";

describe("parseHomeworkPrompt", () => {
  it("recognizes math subject, date and description from free text", () => {
    const text = "по матану решить номера 12–18 к четвергу";
    const result = parseHomeworkPrompt(text, lessons);

    expect(result.lessonId).toBe("math-2026-10-15");
    expect(result.subject).toBe("Математический анализ");
    expect(result.dueDate).toBe("2026-10-15");
    expect(result.description).toContain("решить номера 12–18");
  });

  it("recognizes python subject and explicit date", () => {
    const text = "по питону сделать вторую лабораторную к 2026-10-22";
    const result = parseHomeworkPrompt(text, lessons);

    expect(result.lessonId).toBe("python-2026-10-15");
    expect(result.subject).toBe("Программирование на Python");
    expect(result.dueDate).toBe("2026-10-22");
    expect(result.description).toContain("сделать вторую лабораторную");
  });

  it("recognizes subgroup when mentioned in prompt", () => {
    const text = "для 2 подгруппы по алгоритмам сдать отчёт к пятнице";
    const result = parseHomeworkPrompt(text, lessons);

    expect(result.lessonId).toBe("algorithms-2026-10-15");
    expect(result.subgroup).toBe(2);
    expect(result.dueDate).toBe("2026-10-16");
    expect(result.description).toContain("сдать отчёт");
  });

  it("falls back to default lesson and preserves text when subject is not explicitly named", () => {
    const text = "прочитать статью в учебнике к следующей паре";
    const result = parseHomeworkPrompt(text, lessons);

    expect(result.lessonId).toBe(lessons[0].id);
    expect(result.description).toBe("прочитать статью в учебнике к следующей паре");
    expect(result.dueDate).toBe(lessons[0].date);
  });
});
