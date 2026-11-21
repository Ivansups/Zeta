"use client";

import { CalendarDays, ChevronRight, Clock3, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { HomeworkDescription } from "@/components/homework-description";
import { api, type ApiHomework, type ApiSchedulePair, type ApiUser } from "@/lib/api";
import { formatDeadline } from "@/lib/dates";
import {
  buildHomeworkColumns,
  columnKeyForDeadline,
  type HomeworkColumnKey,
} from "@/lib/homework-columns";
import { lessonKindOf, lessonLocationOf } from "@/lib/schedule";
import type { Subgroup } from "@/lib/types";

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
  return pairs.find(
    (pair) =>
      pair.subject.toLowerCase() === (homework.subject ?? "").toLowerCase() &&
      (!homework.subgroup || homework.subgroup === pair.subgroup),
  );
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
  const [user, setUser] = useState<ApiUser | null>(null);
  const [subgroup, setSubgroup] = useState<Subgroup | "all">(1);
  const [homeworks, setHomeworks] = useState<ApiHomework[] | null>(null);
  const [pairs, setPairs] = useState<ApiSchedulePair[]>([]);
  const columns = useMemo(() => buildHomeworkColumns(new Date()), []);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const me = await api.getMe();
      if (cancelled) {
        return;
      }
      if (me) {
        setUser(me);
        setSubgroup(me.subgroup_number === 2 ? 2 : 1);
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
    const today = new Date();
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
  }, [cards]);

  return (
    <section className="homework-board" aria-label="Канбан домашних заданий">
      <div className="homework-board-toolbar">
        <div>
          <p className="eyebrow">По срокам сдачи</p>
          <h2>Ближайшие задания</h2>
          <p className="page-subtitle">
            {user?.role === "student"
              ? "Каждое ДЗ остаётся у своей пары"
              : "Каждое ДЗ остаётся у своей пары, сроки не теряются"}
          </p>
        </div>
        <div className="segmented-control" role="group" aria-label="Подгруппа">
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

      <div className="homework-board-summary">
        <span>{homeworksLabel(cards.length)}</span>
        <span className="summary-dot" aria-hidden="true" />
        <span>Актуальный список</span>
      </div>

      <div className="kanban-grid">
        {columns.map((column) => {
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
    </section>
  );
}
