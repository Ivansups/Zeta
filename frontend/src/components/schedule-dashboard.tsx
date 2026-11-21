"use client";

import {
  BookOpen,
  ChevronRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api, type ApiHomework, type ApiSchedulePair } from "@/lib/api";
import { lessons, weekDays } from "@/lib/mock-data";
import type { HomeworkDraft, Lesson, Subgroup } from "@/lib/types";

import { HomeworkEditor } from "./homework-editor";
import { LessonCard } from "./lesson-card";

function mapApiPairToLesson(pair: ApiSchedulePair, homeworks: ApiHomework[]): Lesson {
  const matchingHw = homeworks.find(
    (hw) =>
      hw.schedule_pair_id === pair.id ||
      (hw.subject?.toLowerCase() === pair.subject.toLowerCase())
  );

  const kindMap: Record<string, "Лекция" | "Практика" | "Лабораторная"> = {
    "лек": "Лекция",
    "прак": "Практика",
    "лаб": "Лабораторная",
  };

  const kind = (pair.lesson_type && kindMap[pair.lesson_type.toLowerCase()]) || "Практика";

  const accentMap: Record<number, "blue" | "green" | "coral" | "violet"> = {
    1: "blue",
    2: "green",
    3: "coral",
    4: "violet",
  };

  return {
    id: pair.id,
    date: "2026-10-15",
    dayLabel: `${pair.day_of_week}`,
    time: pair.start_time.slice(0, 5),
    endTime: pair.end_time.slice(0, 5),
    subject: pair.subject,
    teacher: [pair.teacher_title, pair.teacher].filter(Boolean).join(" ") || "Преподаватель",
    location: pair.room ? `ауд. ${pair.room}` : pair.is_online ? "Онлайн" : "Корпус 1",
    kind,
    subgroup: (pair.subgroup as Subgroup) || "all",
    accent: accentMap[pair.pair_number] || "blue",
    homework: matchingHw
      ? {
          id: matchingHw.id,
          description: matchingHw.description,
          dueDate: matchingHw.deadline.slice(0, 10),
          subgroup: (matchingHw.subgroup as Subgroup) || "all",
        }
      : undefined,
  };
}

export function ScheduleDashboard(): React.JSX.Element {
  const [subgroup, setSubgroup] = useState<Subgroup>(1);
  const [view, setView] = useState<"day" | "week">("day");
  const [lessonList, setLessonList] = useState<Lesson[]>(lessons);
  const [groupName, setGroupName] = useState<string>("ПИ-221");
  const [editorState, setEditorState] = useState<{
    open: boolean;
    mode?: "form" | "assistant";
    initialData?: {
      id?: string;
      lessonId?: string;
      subgroup?: Subgroup | "all";
      description?: string;
      dueDate?: string;
    } | null;
  }>({ open: false, mode: "form", initialData: null });
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadData(): Promise<void> {
      try {
        const user = await api.getMe();
        if (isCancelled) return;

        const gName = user?.group_id ? undefined : "ПИ-221";
        const [pairs, homeworks] = await Promise.all([
          api.getDaySchedule({
            day: "Понедельник",
            group_name: gName,
            group_id: user?.group_id || undefined,
          }).catch(() => []),
          api.getHomeworks({ group_id: user?.group_id || undefined }).catch(() => []),
        ]);

        if (isCancelled) return;

        if (pairs.length > 0) {
          const mapped = pairs.map((p) => mapApiPairToLesson(p, homeworks));
          setLessonList(mapped);
          if (pairs[0].group_name) {
            setGroupName(pairs[0].group_name);
          }
        }
      } catch {
      }
    }

    void loadData();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (savedMessage) {
      const timer = setTimeout(() => {
        setSavedMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [savedMessage]);

  const visibleLessons = useMemo(
    () => lessonList.filter((lesson) => lesson.subgroup === "all" || lesson.subgroup === subgroup),
    [lessonList, subgroup],
  );

  function handleAddHomework(lesson: Lesson): void {
    setEditorState({
      open: true,
      mode: "form",
      initialData: {
        lessonId: lesson.id,
        subgroup: lesson.subgroup,
        dueDate: lesson.date,
        description: "",
      },
    });
  }

  function handleEditHomework(lesson: Lesson): void {
    if (!lesson.homework) {
      return;
    }
    setEditorState({
      open: true,
      mode: "form",
      initialData: {
        id: lesson.homework.id,
        lessonId: lesson.id,
        subgroup: lesson.subgroup,
        dueDate: lesson.homework.dueDate ?? lesson.date,
        description: lesson.homework.description,
      },
    });
  }

  function handleSave(draft: HomeworkDraft): void {
    const isEdit = Boolean(draft.id);

    setLessonList((prevLessons) =>
      prevLessons.map((item) => {
        if (item.id === draft.lessonId) {
          return {
            ...item,
            homework: {
              id: draft.id || item.homework?.id || `hw-${draft.lessonId}`,
              description: draft.description,
              dueDate: draft.dueDate,
              subgroup: draft.subgroup,
            },
          };
        }
        return item;
      }),
    );

    const lesson = lessonList.find((item) => item.id === draft.lessonId);
    setEditorState({ open: false, mode: "form", initialData: null });

    const deadlineIso = draft.dueDate ? `${draft.dueDate}T23:59:00Z` : new Date().toISOString();
    void api.createHomework({
      title: draft.subject || lesson?.subject || "Домашнее задание",
      description: draft.description,
      subject: draft.subject || lesson?.subject,
      deadline: deadlineIso,
      subgroup: draft.subgroup === "all" ? undefined : (draft.subgroup as number),
      schedule_pair_id: draft.lessonId.length === 36 ? draft.lessonId : undefined,
    }).catch(() => {
    });

    const message = isEdit
      ? `Задание для «${lesson?.subject ?? "пары"}» обновлено`
      : `Задание для «${lesson?.subject ?? "пары"}» сохранено`;
    setSavedMessage(message);
  }

  return (
    <div className="page-wrap">
      <header className="page-header">
        <div>
          <p className="eyebrow">Четверг · числитель</p>
          <h1>Расписание</h1>
          <p className="page-subtitle">{groupName} · 7 учебная неделя</p>
        </div>
        <div className="header-actions">
          <button
            className="button button-secondary assistant-button"
            type="button"
            onClick={() => setEditorState({ open: true, mode: "assistant", initialData: null })}
          >
            <Sparkles size={16} strokeWidth={1.8} />
            Zeta AI
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => setEditorState({ open: true, mode: "form", initialData: null })}
          >
            <Plus size={16} strokeWidth={2} />
            Добавить ДЗ
          </button>
        </div>
      </header>

      {/* Control Toolbar Tile */}
      <section className="schedule-toolbar" aria-label="Параметры расписания">
        <div className="segmented-control" role="group" aria-label="Период">
          <button
            className={view === "day" ? "is-active" : ""}
            type="button"
            onClick={() => setView("day")}
          >
            День
          </button>
          <button
            className={view === "week" ? "is-active" : ""}
            type="button"
            onClick={() => setView("week")}
          >
            Неделя
          </button>
        </div>

        <div className="segmented-control" role="group" aria-label="Подгруппа">
          <button
            className={subgroup === 1 ? "is-active" : ""}
            type="button"
            onClick={() => setSubgroup(1)}
          >
            Подгруппа 1
          </button>
          <button
            className={subgroup === 2 ? "is-active" : ""}
            type="button"
            onClick={() => setSubgroup(2)}
          >
            Подгруппа 2
          </button>
        </div>
      </section>

      {/* Week Calendar Strip Tile */}
      <div className="week-strip" aria-label="Неделя 12–18 октября">
        {weekDays.map((day) => (
          <button className={day.active ? "is-active" : ""} type="button" key={day.date}>
            <span>{day.weekday}</span>
            <strong>{day.date}</strong>
            {day.hasHomework ? <i aria-label="Есть домашнее задание" /> : null}
          </button>
        ))}
      </div>

      {view === "day" ? (
        <section className="day-layout">
          <div className="schedule-list">
            <div className="section-heading">
              <div>
                <h2>Сегодня, 15 октября</h2>
                <p>
                  {visibleLessons.filter((lesson) => lesson.date === "2026-10-15").length} пары · следующая через 24 мин
                </p>
              </div>
              <span className="week-type">Числитель</span>
            </div>

            {visibleLessons
              .filter((lesson) => lesson.date === "2026-10-15")
              .map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  onAddHomework={handleAddHomework}
                  onEditHomework={handleEditHomework}
                />
              ))}
          </div>

          <aside className="upcoming-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Дедлайны</p>
                <h2>Ближайшие ДЗ</h2>
              </div>
              <span className="count-badge">3</span>
            </div>

            {visibleLessons
              .filter((lesson) => lesson.homework)
              .slice(0, 3)
              .map((lesson, index) => (
                <article className="upcoming-item" key={lesson.id}>
                  <div className={`date-tile accent-${lesson.accent}`}>
                    <strong>{15 + index}</strong>
                    <span>окт</span>
                  </div>
                  <div>
                    <strong>{lesson.subject}</strong>
                    <p>{lesson.homework?.description}</p>
                    <span>
                      {index === 0 ? "Сегодня" : index === 1 ? "Завтра" : "В субботу"} · {lesson.time}
                    </span>
                  </div>
                </article>
              ))}

            <a className="text-link" href="/homework">
              Все задания <ChevronRight size={15} strokeWidth={2} />
            </a>
          </aside>
        </section>
      ) : (
        <section className="week-grid" aria-label="Расписание на неделю">
          {["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"].map((day, index) => (
            <div className={index === 3 ? "week-column is-current" : "week-column"} key={day}>
              <div className="week-column-title">
                <span>{day}</span>
                <strong>{12 + index}</strong>
              </div>
              {visibleLessons.slice(index % 2, index % 2 + 2).map((lesson) => (
                <article className={`week-lesson accent-${lesson.accent}`} key={`${day}-${lesson.id}`}>
                  <span>{lesson.time}</span>
                  <strong>{lesson.subject}</strong>
                  <small>{lesson.location}</small>
                  {lesson.homework ? (
                    <BookOpen size={14} strokeWidth={1.8} aria-label="Есть домашнее задание" />
                  ) : null}
                </article>
              ))}
            </div>
          ))}
        </section>
      )}

      {savedMessage ? <div className="toast" role="status">{savedMessage}</div> : null}
      <HomeworkEditor
        open={editorState.open}
        initialMode={editorState.mode}
        initialData={editorState.initialData}
        onClose={() => setEditorState({ open: false, mode: "form", initialData: null })}
        onSave={handleSave}
      />
    </div>
  );
}
