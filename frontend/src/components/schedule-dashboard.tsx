"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { lessons, weekDays } from "@/lib/mock-data";
import type { HomeworkDraft, Lesson, Subgroup } from "@/lib/types";

import { HomeworkEditor } from "./homework-editor";

function LessonCard({ lesson }: { lesson: Lesson }): React.JSX.Element {
  return (
    <article className={`lesson-card accent-${lesson.accent}`}>
      <div className="lesson-time">
        <strong>{lesson.time}</strong>
        <span>{lesson.endTime}</span>
      </div>
      <div className="lesson-main">
        <div className="lesson-heading">
          <div>
            <span className="lesson-kind">{lesson.kind}</span>
            <h3>{lesson.subject}</h3>
          </div>
          {lesson.subgroup === "all" ? <span className="quiet-badge">Вся группа</span> : null}
        </div>
        <p className="lesson-meta">
          <span><MapPin size={15} />{lesson.location}</span>
          <span><Clock3 size={15} />{lesson.teacher}</span>
        </p>
        {lesson.homework ? (
          <div className="homework-inline">
            <BookOpen size={17} />
            <div>
              <strong>Домашнее задание</strong>
              <p>{lesson.homework.description}</p>
            </div>
          </div>
        ) : (
          <p className="no-homework">Домашнего задания пока нет</p>
        )}
      </div>
    </article>
  );
}

export function ScheduleDashboard(): React.JSX.Element {
  const [subgroup, setSubgroup] = useState<Subgroup>(1);
  const [view, setView] = useState<"day" | "week">("day");
  const [editorOpen, setEditorOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const visibleLessons = useMemo(
    () => lessons.filter((lesson) => lesson.subgroup === "all" || lesson.subgroup === subgroup),
    [subgroup],
  );

  function handleSave(draft: HomeworkDraft): void {
    const lesson = lessons.find((item) => item.id === draft.lessonId);
    setEditorOpen(false);
    setSavedMessage(`Задание для «${lesson?.subject ?? "пары"}» сохранено`);
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
          <button className="button button-secondary assistant-button" type="button" onClick={() => setEditorOpen(true)}>
            <Sparkles size={17} />
            Zeta AI
          </button>
          <button className="button button-primary" type="button" onClick={() => setEditorOpen(true)}>
            <Plus size={18} />
            Добавить ДЗ
          </button>
        </div>
      </header>

      <section className="schedule-toolbar" aria-label="Параметры расписания">
        <div className="segmented-control" role="group" aria-label="Период">
          <button className={view === "day" ? "is-active" : ""} type="button" onClick={() => setView("day")}>День</button>
          <button className={view === "week" ? "is-active" : ""} type="button" onClick={() => setView("week")}>Неделя</button>
        </div>
        <div className="date-navigation">
          <button className="icon-button" type="button" aria-label="Предыдущий день"><ChevronLeft size={19} /></button>
          <button className="today-button" type="button">Сегодня</button>
          <button className="icon-button" type="button" aria-label="Следующий день"><ChevronRight size={19} /></button>
        </div>
        <div className="segmented-control subgroup-control" role="group" aria-label="Подгруппа">
          <button className={subgroup === 1 ? "is-active" : ""} type="button" onClick={() => setSubgroup(1)}>Подгруппа 1</button>
          <button className={subgroup === 2 ? "is-active" : ""} type="button" onClick={() => setSubgroup(2)}>Подгруппа 2</button>
        </div>
      </section>

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
                <p>{visibleLessons.filter((lesson) => lesson.date === "2026-10-15").length} пары · следующая через 24 мин</p>
              </div>
              <span className="week-type">Числитель</span>
            </div>
            {visibleLessons.filter((lesson) => lesson.date === "2026-10-15").map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>

          <aside className="upcoming-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Дальше</p>
                <h2>Ближайшие ДЗ</h2>
              </div>
              <span className="count-badge">3</span>
            </div>
            {visibleLessons.filter((lesson) => lesson.homework).slice(0, 3).map((lesson, index) => (
              <article className="upcoming-item" key={lesson.id}>
                <div className={`date-tile accent-${lesson.accent}`}>
                  <strong>{15 + index}</strong>
                  <span>окт</span>
                </div>
                <div>
                  <strong>{lesson.subject}</strong>
                  <p>{lesson.homework?.description}</p>
                  <span>{index === 0 ? "Сегодня" : index === 1 ? "Завтра" : "В субботу"} · {lesson.time}</span>
                </div>
              </article>
            ))}
            <a className="text-link" href="/homework">Все задания <ChevronRight size={16} /></a>
          </aside>
        </section>
      ) : (
        <section className="week-grid" aria-label="Расписание на неделю">
          {["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"].map((day, index) => (
            <div className={index === 3 ? "week-column is-current" : "week-column"} key={day}>
              <div className="week-column-title"><span>{day}</span><strong>{12 + index}</strong></div>
              {visibleLessons.slice(index % 2, index % 2 + 2).map((lesson) => (
                <article className={`week-lesson accent-${lesson.accent}`} key={`${day}-${lesson.id}`}>
                  <span>{lesson.time}</span>
                  <strong>{lesson.subject}</strong>
                  <small>{lesson.location}</small>
                  {lesson.homework ? <BookOpen size={15} aria-label="Есть домашнее задание" /> : null}
                </article>
              ))}
            </div>
          ))}
        </section>
      )}

      {savedMessage ? <div className="toast" role="status">{savedMessage}</div> : null}
      <HomeworkEditor open={editorOpen} onClose={() => setEditorOpen(false)} onSave={handleSave} />
    </div>
  );
}
