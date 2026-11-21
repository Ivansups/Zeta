"use client";

import { ChevronRight, Clock3, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { api, type ApiHomework } from "@/lib/api";
import type { Lesson, Subgroup } from "@/lib/types";
import { addDays, currentDayName, formatDayCaption } from "@/lib/week";

type DayColumn = {
  date: string;
  title: string;
  caption: string;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildColumns(today: Date): DayColumn[] {
  return [0, 1, 2].map((offset) => {
    const date = addDays(today, offset);
    const title =
      offset === 0 ? "Сегодня" : offset === 1 ? "Завтра" : currentDayName(date);
    return { date: isoDate(date), title, caption: formatDayCaption(date) };
  });
}

function HomeworkCard({ lesson }: { lesson: Lesson }): React.JSX.Element {
  return (
    <article className={`homework-card accent-${lesson.accent}`}>
      <div className="homework-card-topline">
        <span className="homework-kind">{lesson.kind}</span>
        <span className="homework-date"><Clock3 size={13} strokeWidth={1.8} />{lesson.time}</span>
      </div>
      <h3>{lesson.subject}</h3>
      <p className="homework-description">{lesson.homework?.description}</p>
      <p className="homework-location"><MapPin size={13} strokeWidth={1.8} />{lesson.location}</p>
      <div className="homework-card-footer">
        <span className="homework-subgroup">
          {lesson.subgroup === "all" ? "Вся группа" : `Подгруппа ${lesson.subgroup}`}
        </span>
        <Link className="homework-link" href={`/?lesson=${lesson.id}`}>
          К паре <ChevronRight size={14} strokeWidth={2} />
        </Link>
      </div>
    </article>
  );
}

export function HomeworkBoard(): React.JSX.Element {
  const [subgroup, setSubgroup] = useState<Subgroup>(1);
  const [realHomeworks, setRealHomeworks] = useState<ApiHomework[] | null>(null);
  const columns = useMemo(() => buildColumns(new Date()), []);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const list = await api.getHomeworks();
        if (!cancelled) {
          setRealHomeworks(list);
        }
      } catch {
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const homeworkLessons = useMemo(() => {
    if (realHomeworks) {
      return realHomeworks
        .filter((hw) => !hw.subgroup || hw.subgroup === subgroup)
        .map((hw, idx) => ({
          id: hw.id,
          date: hw.deadline.slice(0, 10),
          dayLabel: "Срок сдачи",
          time: hw.deadline.slice(11, 16) || "23:59",
          endTime: "",
          subject: hw.subject || hw.title,
          teacher: "",
          location: "Онлайн",
          kind: "Практика" as const,
          subgroup: (hw.subgroup as Subgroup) || ("all" as const),
          accent: (["blue", "green", "coral", "violet"][idx % 4] as "blue" | "green" | "coral" | "violet"),
          homework: {
            id: hw.id,
            description: hw.description,
            dueDate: hw.deadline.slice(0, 10),
            subgroup: (hw.subgroup as Subgroup) || "all",
          },
        }));
    }

    return [];
  }, [realHomeworks, subgroup]);

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
        <span>Актуальный список</span>
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
                  <HomeworkCard key={lesson.homework?.id || lesson.id} lesson={lesson} />
                )) : <p className="kanban-empty">Заданий на этот день нет</p>}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
