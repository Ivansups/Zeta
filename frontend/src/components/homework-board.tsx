"use client";

import { ChevronRight, Clock3, MapPin } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { lessons } from "@/lib/mock-data";
import type { Lesson, Subgroup } from "@/lib/types";

type DayColumn = {
  date: string;
  title: string;
  caption: string;
};

const columns: DayColumn[] = [
  { date: "2026-10-15", title: "Сегодня", caption: "15 октября" },
  { date: "2026-10-16", title: "Завтра", caption: "16 октября" },
  { date: "2026-10-17", title: "Суббота", caption: "17 октября" },
];

function HomeworkCard({ lesson }: { lesson: Lesson }): React.JSX.Element {
  return (
    <article className={`homework-card accent-${lesson.accent}`}>
      <div className="homework-card-topline">
        <span className="homework-kind">{lesson.kind}</span>
        <span className="homework-date"><Clock3 size={14} />{lesson.time}</span>
      </div>
      <h3>{lesson.subject}</h3>
      <p className="homework-description">{lesson.homework?.description}</p>
      <p className="homework-location"><MapPin size={14} />{lesson.location}</p>
      <div className="homework-card-footer">
        <span className="homework-subgroup">
          {lesson.subgroup === "all" ? "Вся группа" : `Подгруппа ${lesson.subgroup}`}
        </span>
        <Link className="homework-link" href={`/?lesson=${lesson.id}`}>
          К паре <ChevronRight size={15} />
        </Link>
      </div>
    </article>
  );
}

export function HomeworkBoard(): React.JSX.Element {
  const [subgroup, setSubgroup] = useState<Subgroup>(1);

  const homeworkLessons = useMemo(
    () => lessons.filter(
      (lesson) => lesson.homework && (lesson.subgroup === "all" || lesson.subgroup === subgroup),
    ),
    [subgroup],
  );

  return (
    <section className="homework-board" aria-label="Канбан домашних заданий">
      <div className="homework-board-toolbar">
        <div>
          <p className="eyebrow">По датам занятий</p>
          <h2>Ближайшие задания</h2>
          <p className="page-subtitle">Без статусов: каждое ДЗ остаётся у своей пары</p>
        </div>
        <div className="segmented-control" role="group" aria-label="Подгруппа">
          <button className={subgroup === 1 ? "is-active" : ""} type="button" onClick={() => setSubgroup(1)}>Подгруппа 1</button>
          <button className={subgroup === 2 ? "is-active" : ""} type="button" onClick={() => setSubgroup(2)}>Подгруппа 2</button>
        </div>
      </div>

      <div className="homework-board-summary">
        <span>{homeworkLessons.length} задания</span>
        <span className="summary-dot" aria-hidden="true" />
        <span>Обновлено сегодня в 09:24</span>
      </div>

      <div className="kanban-grid">
        {columns.map((column) => {
          const columnLessons = homeworkLessons.filter((lesson) => lesson.date === column.date);
          return (
            <section className="kanban-column" key={column.date} aria-labelledby={`day-${column.date}`}>
              <header className="kanban-column-header">
                <div>
                  <h2 id={`day-${column.date}`}>{column.title}</h2>
                  <p>{column.caption}</p>
                </div>
                <span className="count-badge" aria-label={`${columnLessons.length} заданий`}>{columnLessons.length}</span>
              </header>
              <div className="kanban-card-list">
                {columnLessons.length ? columnLessons.map((lesson) => (
                  <HomeworkCard key={lesson.homework?.id} lesson={lesson} />
                )) : <p className="kanban-empty">Заданий на этот день нет</p>}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
