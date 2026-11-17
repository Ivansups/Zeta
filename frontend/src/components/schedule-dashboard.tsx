"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { lessons, weekDays } from "@/lib/mock-data";
import type { HomeworkDraft, Lesson, Subgroup } from "@/lib/types";

import { HomeworkEditor } from "./homework-editor";
import { LessonCard } from "./lesson-card";

export function ScheduleDashboard(): React.JSX.Element {
  const [subgroup, setSubgroup] = useState<Subgroup>(1);
  const [view, setView] = useState<"day" | "week">("day");
  const [lessonList, setLessonList] = useState<Lesson[]>(lessons);
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
          <p className="page-subtitle">ПИ-221 · 7 учебная неделя</p>
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

        <div className="date-navigation">
          <button className="icon-button" type="button" aria-label="Предыдущий день">
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>
          <button className="today-button" type="button">
            Сегодня
          </button>
          <button className="icon-button" type="button" aria-label="Следующий день">
            <ChevronRight size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="segmented-control subgroup-control" role="group" aria-label="Подгруппа">
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
