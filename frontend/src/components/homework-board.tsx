"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Send,
  ShieldCheck,
  Undo2,
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
import { canManageHomework } from "@/lib/permissions";
import { lessonKindOf, lessonLocationOf } from "@/lib/schedule";
import type { Subgroup } from "@/lib/types";
import { addDays, currentDayName, formatDayCaption } from "@/lib/week";

import { HomeworkModerationModal } from "./homework-moderation-modal";

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

type HomeworkCardProps = {
  card: BoardCard;
  currentUserId?: string | null;
  canManage?: boolean;
  onToggleCompletion?: (homeworkId: string) => Promise<void> | void;
  onSuggest?: (homeworkId: string) => Promise<void> | void;
  onRecall?: (homeworkId: string) => Promise<void> | void;
  onModerate?: (homework: ApiHomework) => void;
  onUpdateParticipant?: (
    homeworkId: string,
    userId: string,
    isSubmitted: boolean,
  ) => Promise<void> | void;
};

function HomeworkCard({
  card,
  currentUserId,
  canManage,
  onToggleCompletion,
  onSuggest,
  onRecall,
  onModerate,
  onUpdateParticipant,
}: HomeworkCardProps): React.JSX.Element {
  const { homework, pair, accent } = card;
  const kind = lessonKindOf(pair);
  const location = lessonLocationOf(pair);

  const isAuthor = Boolean(
    currentUserId && homework.created_by_id === currentUserId,
  );
  const canSuggest =
    isAuthor && homework.is_personal && homework.status !== "pending_approval";
  const canRecall = isAuthor && homework.status === "pending_approval";
  const canModerateAction = canManage && homework.status === "pending_approval";

  return (
    <article className={`homework-card accent-${accent}`}>
      <div className="homework-card-topline">
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span className="homework-kind">{kind ?? "Задание"}</span>
          {homework.is_personal ? (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "rgba(99, 102, 241, 0.12)",
                color: "#6366f1",
              }}
            >
              Личное
            </span>
          ) : null}
          {homework.status === "pending_approval" ? (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "rgba(234, 179, 8, 0.15)",
                color: "#ca8a04",
              }}
            >
              На модерации
            </span>
          ) : null}
          {homework.status === "rejected" ? (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#dc2626",
              }}
            >
              Отклонено
            </span>
          ) : null}
        </div>
        <span className="homework-date">
          <CalendarDays size={13} strokeWidth={1.8} />
          {formatDeadline(homework.deadline)}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          margin: "10px 0 6px",
        }}
      >
        {onToggleCompletion ? (
          <button
            type="button"
            className="icon-button"
            onClick={() => onToggleCompletion(homework.id)}
            style={{
              padding: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: homework.is_completed ? "#16a34a" : "var(--muted)",
              marginTop: "2px",
              flexShrink: 0,
            }}
            aria-label={
              homework.is_completed
                ? "Отметить невыполненным"
                : "Отметить выполненным"
            }
            title={
              homework.is_completed
                ? "Отметить невыполненным"
                : "Отметить выполненным"
            }
          >
            <CheckCircle2
              size={18}
              strokeWidth={homework.is_completed ? 2.5 : 1.8}
            />
          </button>
        ) : null}
        <h3
          style={{
            margin: 0,
            textDecoration: homework.is_completed ? "line-through" : "none",
            opacity: homework.is_completed ? 0.6 : 1,
            flex: 1,
          }}
        >
          {homework.subject ?? homework.title}
        </h3>
      </div>

      <HomeworkDescription text={homework.description} />

      {homework.status === "rejected" && homework.moderation_comment ? (
        <div
          style={{
            marginTop: "8px",
            padding: "6px 10px",
            borderRadius: "6px",
            background: "rgba(239, 68, 68, 0.08)",
            color: "#dc2626",
            fontSize: "12px",
            lineHeight: 1.4,
          }}
        >
          <strong>Причина отклонения:</strong> {homework.moderation_comment}
        </div>
      ) : null}

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

      {homework.participants && homework.participants.length > 0 ? (
        <div
          style={{
            marginTop: "10px",
            paddingTop: "8px",
            borderTop: "1px dashed var(--border-soft)",
            fontSize: "12px",
          }}
        >
          <span
            style={{
              color: "var(--muted)",
              fontWeight: 500,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Участники задания:
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {homework.participants.map((p) => {
              const isMe = p.user_id === currentUserId;
              return (
                <button
                  key={p.user_id}
                  type="button"
                  disabled={!canManage}
                  onClick={
                    canManage && onUpdateParticipant
                      ? () =>
                          onUpdateParticipant(
                            homework.id,
                            p.user_id,
                            !p.is_submitted,
                          )
                      : undefined
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: canManage ? "pointer" : "default",
                    borderColor: p.is_submitted ? "#16a34a" : "var(--border)",
                    background: p.is_submitted
                      ? "rgba(34, 197, 94, 0.1)"
                      : "var(--card-soft)",
                    color: p.is_submitted ? "#16a34a" : "var(--foreground)",
                  }}
                  title={
                    canManage
                      ? "Нажмите для смены статуса сдачи"
                      : undefined
                  }
                >
                  <span>
                    {isMe ? "Вы" : `Студент ${p.user_id.slice(0, 4)}`}
                  </span>
                  <span>{p.is_submitted ? "✓" : "—"}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className="homework-card-footer"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span className="homework-subgroup">
            {homework.subgroup
              ? `Подгруппа ${homework.subgroup}`
              : "Вся группа"}
          </span>
          {pair ? (
            <Link className="homework-link" href={`/?lesson=${pair.id}`}>
              К паре <ChevronRight size={14} strokeWidth={2} />
            </Link>
          ) : null}
        </div>

        {canSuggest || canRecall || canModerateAction ? (
          <div
            style={{
              display: "flex",
              gap: "6px",
              justifyContent: "flex-end",
              borderTop: "1px solid var(--border-soft)",
              paddingTop: "8px",
            }}
          >
            {canSuggest ? (
              <button
                type="button"
                className="button button-sm button-secondary"
                onClick={() => onSuggest?.(homework.id)}
                style={{
                  fontSize: "11px",
                  padding: "4px 8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Send size={12} />
                Предложить в группу
              </button>
            ) : null}
            {canRecall ? (
              <button
                type="button"
                className="button button-sm button-secondary"
                onClick={() => onRecall?.(homework.id)}
                style={{
                  fontSize: "11px",
                  padding: "4px 8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Undo2 size={12} />
                Отозвать
              </button>
            ) : null}
            {canModerateAction ? (
              <button
                type="button"
                className="button button-sm button-primary"
                onClick={() => onModerate?.(homework)}
                style={{
                  fontSize: "11px",
                  padding: "4px 8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ShieldCheck size={12} />
                Модерация
              </button>
            ) : null}
          </div>
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState<boolean>(false);
  const [moderatingHomework, setModeratingHomework] =
    useState<ApiHomework | null>(null);

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
        setCurrentUserId(me.id);
        setCanManage(canManageHomework(me));
        setSubgroup(me.subgroup_number === 2 ? 2 : 1);
      }
      const [list, weekPairs] = await Promise.all([
        api.getHomeworks().catch(() => [] as ApiHomework[]),
        api
          .getWeekSchedule(me?.group_id ? { group_id: me.group_id } : {})
          .catch(() => [] as ApiSchedulePair[]),
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

  async function handleToggleCompletion(homeworkId: string): Promise<void> {
    try {
      const res = await api.toggleHomeworkCompletion(homeworkId);
      setHomeworks((prev) =>
        prev
          ? prev.map((hw) =>
              hw.id === homeworkId
                ? { ...hw, is_completed: res.is_completed }
                : hw,
            )
          : null,
      );
    } catch (err) {
      console.error("Failed to toggle homework completion", err);
    }
  }

  async function handleSuggest(homeworkId: string): Promise<void> {
    try {
      const updated = await api.suggestHomework(homeworkId);
      setHomeworks((prev) =>
        prev ? prev.map((hw) => (hw.id === homeworkId ? updated : hw)) : null,
      );
    } catch (err) {
      console.error("Failed to suggest homework", err);
    }
  }

  async function handleRecall(homeworkId: string): Promise<void> {
    try {
      const updated = await api.recallHomework(homeworkId);
      setHomeworks((prev) =>
        prev ? prev.map((hw) => (hw.id === homeworkId ? updated : hw)) : null,
      );
    } catch (err) {
      console.error("Failed to recall homework", err);
    }
  }

  async function handleModerate(
    homeworkId: string,
    data: Parameters<typeof api.moderateHomework>[1],
  ): Promise<void> {
    const updated = await api.moderateHomework(homeworkId, data);
    setHomeworks((prev) =>
      prev ? prev.map((hw) => (hw.id === homeworkId ? updated : hw)) : null,
    );
  }

  async function handleUpdateParticipant(
    homeworkId: string,
    userId: string,
    isSubmitted: boolean,
  ): Promise<void> {
    try {
      const updatedPart = await api.updateParticipantStatus(
        homeworkId,
        userId,
        isSubmitted,
      );
      setHomeworks((prev) =>
        prev
          ? prev.map((hw) => {
              if (hw.id !== homeworkId) return hw;
              const participants = (hw.participants || []).map((p) =>
                p.user_id === userId ? updatedPart : p,
              );
              return { ...hw, participants };
            })
          : null,
      );
    } catch (err) {
      console.error("Failed to update participant status", err);
    }
  }

  const cards = useMemo<BoardCard[]>(() => {
    if (!homeworks) {
      return [];
    }
    return homeworks
      .filter(
        (hw) =>
          subgroup === "all" || !hw.subgroup || hw.subgroup === subgroup,
      )
      .sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      })
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
      backlog: [],
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
      if (!card.homework.deadline) return;
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

  return (
    <section className="homework-board" aria-label="Канбан домашних заданий">
      <div className="homework-board-toolbar">
        <div>
          <p className="eyebrow">
            {viewMode === "timeline" ? "По срокам сдачи" : "По дням недели"}
          </p>
          <h2>
            {viewMode === "timeline"
              ? "Ближайшие задания"
              : "Задания на неделю"}
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
                {formatDayCaption(selectedMonday)} —{" "}
                {formatDayCaption(selectedSunday)}
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
                      <HomeworkCard
                        key={card.homework.id}
                        card={card}
                        currentUserId={currentUserId}
                        canManage={canManage}
                        onToggleCompletion={handleToggleCompletion}
                        onSuggest={handleSuggest}
                        onRecall={handleRecall}
                        onModerate={setModeratingHomework}
                        onUpdateParticipant={handleUpdateParticipant}
                      />
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
                      <HomeworkCard
                        key={card.homework.id}
                        card={card}
                        currentUserId={currentUserId}
                        canManage={canManage}
                        onToggleCompletion={handleToggleCompletion}
                        onSuggest={handleSuggest}
                        onRecall={handleRecall}
                        onModerate={setModeratingHomework}
                        onUpdateParticipant={handleUpdateParticipant}
                      />
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

      <HomeworkModerationModal
        homework={moderatingHomework}
        open={Boolean(moderatingHomework)}
        onClose={() => setModeratingHomework(null)}
        onModerate={handleModerate}
      />
    </section>
  );
}
