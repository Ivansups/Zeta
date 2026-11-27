"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { HomeworkDescription } from "@/components/homework-description";
import {
  api,
  type ApiHomework,
  type ApiSchedulePair,
} from "@/lib/api";
import { deadlineDate, formatDeadline } from "@/lib/dates";
import {
  buildCalendarWeekColumns,
  buildHomeworkColumns,
  columnKeyForDeadline,
  getWeekMonday,
  type HomeworkColumnKey,
  type HomeworkViewMode,
} from "@/lib/homework-columns";
import { lessonKindOf, lessonLocationOf } from "@/lib/schedule";
import type { Subgroup } from "@/lib/types";

import { OnboardingCard } from "./onboarding-card";
import { addDays, currentDayName, formatDayCaption } from "@/lib/week";

function homeworksLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${count} задание`;
  }
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) {
    return `${count} задания`;
  }
  return `${count} заданий`;
}

type BoardCard = {
  homework: ApiHomework;
  pair?: ApiSchedulePair;
  accent: "blue" | "green" | "coral" | "violet";
};

const ACCENTS = ["blue", "green", "coral", "violet"] as const;

function findPair(
  homework: ApiHomework,
  pairs: ApiSchedulePair[],
): ApiSchedulePair | undefined {
  if (homework.schedule_pair_id) {
    const byId = pairs.find((pair) => pair.id === homework.schedule_pair_id);
    if (byId) {
      return byId;
    }
  }
  const matching = pairs.filter(
    (pair) =>
      pair.subject.toLowerCase() === (homework.subject ?? "").toLowerCase() &&
      (!homework.subgroup || homework.subgroup === pair.subgroup),
  );
  if (matching.length === 0) {
    return undefined;
  }
  if (matching.length === 1) {
    return matching[0];
  }
  if (homework.deadline) {
    const [y, m, d] = deadlineDate(homework.deadline).split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dayName = currentDayName(date);
    const onSameDay = matching.find(
      (pair) => pair.day_of_week.toLowerCase() === dayName.toLowerCase(),
    );
    if (onSameDay) {
      return onSameDay;
    }
  }
  return matching[0];
}

function HomeworkCard({ card }: { card: BoardCard }): React.JSX.Element {
  const { homework, pair, accent } = card;
  const kind = lessonKindOf(pair);
  const location = lessonLocationOf(pair);

  return (
    <article className={`homework-card accent-${accent}`}>
      <div className="homework-card-topline">
        <span className="homework-kind">{kind ?? "Задание"}</span>
        <span className="homework-date">
          <CalendarDays size={13} strokeWidth={1.8} />
          {formatDeadline(homework.deadline)}
        </span>
      </div>
      <h3>{homework.subject ?? homework.title}</h3>
      <HomeworkDescription text={homework.description} />
      {pair ? (
        <p className="homework-location">
          <span>
            <Clock3 size={13} strokeWidth={1.8} />
            {pair.start_time.slice(0, 5)}–{pair.end_time.slice(0, 5)}
          </span>
          {location ? (
            <span>
              <MapPin size={13} strokeWidth={1.8} />
              {location}
            </span>
          ) : null}
        </p>
      ) : null}
      <div className="homework-card-footer">
        <span className="homework-subgroup">
          {homework.subgroup ? `Подгруппа ${homework.subgroup}` : "Вся группа"}
        </span>
        {pair ? (
          <Link className="homework-link" href={`/?lesson=${pair.id}`}>
            К паре <ChevronRight size={14} strokeWidth={2} />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function HomeworkBoard(): React.JSX.Element {
  const [viewMode, setViewMode] = useState<HomeworkViewMode>("timeline");
  const [subgroup, setSubgroup] = useState<Subgroup | "all">(1);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [homeworks, setHomeworks] = useState<ApiHomework[] | null>(null);
  const [pairs, setPairs] = useState<ApiSchedulePair[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const today = useMemo(() => new Date(), []);
  const timelineColumns = useMemo(() => buildHomeworkColumns(today), [today]);

  const currentMonday = useMemo(() => getWeekMonday(today), [today]);
  const selectedMonday = useMemo(
    () => addDays(currentMonday, weekOffset * 7),
    [currentMonday, weekOffset],
  );
  const selectedSunday = useMemo(
    () => addDays(selectedMonday, 6),
    [selectedMonday],
  );
  const calendarColumns = useMemo(
    () => buildCalendarWeekColumns(selectedMonday, today),
    [selectedMonday, today],
  );

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const me = await api.getMe();
      if (cancelled) {
        return;
      }
      if (me) {
        setSubgroup(me.subgroup_number === 2 ? 2 : 1);
      }
      if (me && !me.group_id) {
        setNeedsOnboarding(true);
        setLoaded(true);
        return;
      }
      const [list, weekPairs] = await Promise.all([
        api.getHomeworks().catch(() => [] as ApiHomework[]),
        api.getWeekSchedule(me?.group_id ? { group_id: me.group_id } : {}).catch(
          () => [] as ApiSchedulePair[],
        ),
      ]);
      if (!cancelled) {
        setHomeworks(list);
        setPairs(weekPairs);
        setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo<BoardCard[]>(() => {
    if (!homeworks) {
      return [];
    }
    return homeworks
      .filter(
        (hw) => subgroup === "all" || !hw.subgroup || hw.subgroup === subgroup,
      )
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .map((hw, index) => ({
        homework: hw,
        pair: findPair(hw, pairs),
        accent: ACCENTS[index % ACCENTS.length],
      }));
  }, [homeworks, subgroup, pairs]);

  const cardsByColumn = useMemo(() => {
    const grouped: Record<HomeworkColumnKey, BoardCard[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      later: [],
    };
    cards.forEach((card) => {
      grouped[columnKeyForDeadline(card.homework.deadline, today)].push(card);
    });
    return grouped;
  }, [cards, today]);

  const cardsByDay = useMemo(() => {
    const map = new Map<string, BoardCard[]>();
    calendarColumns.forEach((col) => map.set(col.date, []));
    cards.forEach((card) => {
      const date = deadlineDate(card.homework.deadline);
      const list = map.get(date);
      if (list) {
        list.push(card);
      }
    });
    return map;
  }, [cards, calendarColumns]);

  const weekCardsCount = useMemo(() => {
    let count = 0;
    calendarColumns.forEach((col) => {
      count += cardsByDay.get(col.date)?.length ?? 0;
    });
    return count;
  }, [calendarColumns, cardsByDay]);

  if (loaded && needsOnboarding) {
    return <OnboardingCard />;
  }

  return (
    <section className="homework-board" aria-label="Канбан домашних заданий">
      <div className="homework-board-toolbar">
        <div>
          <p className="eyebrow">
            {viewMode === "timeline" ? "По срокам сдачи" : "По дням недели"}
          </p>
          <h2>
            {viewMode === "timeline" ? "Ближайшие задания" : "Задания на неделю"}
          </h2>
          <p className="page-subtitle">
            {viewMode === "timeline"
              ? "Срочные дедлайны и долги в одном месте"
              : "Распределение заданий по учебным дням недели"}
          </p>
        </div>
        <div className="homework-board-controls">
          <div
            className="segmented-control"
            role="group"
            aria-label="Режим просмотра"
          >
            <button
              className={viewMode === "timeline" ? "is-active" : ""}
              type="button"
              onClick={() => setViewMode("timeline")}
            >
              По срокам
            </button>
            <button
              className={viewMode === "days" ? "is-active" : ""}
              type="button"
              onClick={() => setViewMode("days")}
            >
              По дням недели
            </button>
          </div>

          <div
            className="segmented-control"
            role="group"
            aria-label="Подгруппа"
          >
            <button
              className={subgroup === "all" ? "is-active" : ""}
              type="button"
              onClick={() => setSubgroup("all")}
            >
              Все
            </button>
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
        </div>
      </div>

      {viewMode === "days" ? (
        <nav className="calendar-nav-bar" aria-label="Навигация по неделям">
          <div className="calendar-week-switcher">
            <button
              type="button"
              className="icon-button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              aria-label="Предыдущая неделя"
            >
              <ChevronLeft size={16} strokeWidth={2} />
              <span>Пред. неделя</span>
            </button>
            <div className="calendar-week-heading">
              <span>
                {formatDayCaption(selectedMonday)} — {formatDayCaption(selectedSunday)}
              </span>
              {weekOffset === 0 ? (
                <span className="current-week-tag">Текущая неделя</span>
              ) : (
                <button
                  type="button"
                  className="calendar-reset-btn"
                  onClick={() => setWeekOffset(0)}
                >
                  Вернуться к текущей
                </button>
              )}
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              aria-label="Следующая неделя"
            >
              <span>След. неделя</span>
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </nav>
      ) : null}

      <div className="homework-board-summary">
        {viewMode === "timeline" ? (
          <>
            <span>{homeworksLabel(cards.length)}</span>
            <span className="summary-dot" aria-hidden="true" />
            <span>Актуальный список</span>
          </>
        ) : (
          <>
            <span>{homeworksLabel(weekCardsCount)} на выбранную неделю</span>
            <span className="summary-dot" aria-hidden="true" />
            <span>Всего активных: {cards.length}</span>
          </>
        )}
      </div>

      {viewMode === "timeline" ? (
        <div
          className="kanban-grid"
          style={
            { "--kanban-cols": timelineColumns.length } as React.CSSProperties
          }
        >
          {timelineColumns.map((column) => {
            const columnCards = cardsByColumn[column.key];
            return (
              <section
                className="kanban-column"
                key={column.key}
                aria-label={column.title}
              >
                <header className="kanban-column-header">
                  <div>
                    <h2>{column.title}</h2>
                    <p>{column.caption}</p>
                  </div>
                  <span
                    className="count-badge"
                    aria-label={`${columnCards.length} заданий`}
                  >
                    {columnCards.length}
                  </span>
                </header>
                <div className="kanban-card-list">
                  {columnCards.length ? (
                    columnCards.map((card) => (
                      <HomeworkCard key={card.homework.id} card={card} />
                    ))
                  ) : (
                    <p className="kanban-empty">Заданий на этот день нет</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div
          className="kanban-grid is-calendar"
          style={
            { "--kanban-cols": calendarColumns.length } as React.CSSProperties
          }
        >
          {calendarColumns.map((column) => {
            const columnCards = cardsByDay.get(column.date) ?? [];
            return (
              <section
                className={`kanban-column ${column.isToday ? "is-today" : ""}`}
                key={column.date}
                aria-label={`${column.title}, ${column.caption}`}
              >
                <header className="kanban-column-header">
                  <div>
                    <div className="column-title-row">
                      <h2>{column.title}</h2>
                      {column.isToday ? (
                        <span className="today-badge">Сегодня</span>
                      ) : null}
                    </div>
                    <p>{column.caption}</p>
                  </div>
                  <span
                    className="count-badge"
                    aria-label={`${columnCards.length} заданий`}
                  >
                    {columnCards.length}
                  </span>
                </header>
                <div className="kanban-card-list">
                  {columnCards.length ? (
                    columnCards.map((card) => (
                      <HomeworkCard key={card.homework.id} card={card} />
                    ))
                  ) : (
                    <p className="kanban-empty">Заданий на этот день нет</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
