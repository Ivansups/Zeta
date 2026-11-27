"use client";

import { BookOpen, ChevronRight, Plus, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api, type ApiHomework, type ApiSchedulePair } from "@/lib/api";
import { deadlineDate, deadlineToIso, formatDeadline, localIsoDate } from "@/lib/dates";
import { canManageHomework } from "@/lib/permissions";
import { lessonKindOf, lessonLocationOf, pairMatchesParity, type WeekParityFilter } from "@/lib/schedule";
import type { HomeworkDraft, Lesson, Subgroup } from "@/lib/types";
import {
  WEEK_DAYS,
  addDays,
  currentDayName,
  currentStudyWeek,
  formatDayCaption,
  shortDayName,
} from "@/lib/week";

import { HomeworkEditor } from "./homework-editor";
import { LessonCard } from "./lesson-card";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACCENTS = ["blue", "green", "coral", "violet"] as const;

function weekdayDate(dayName: string, reference: Date): Date {
  const targetIndex = WEEK_DAYS.indexOf(dayName as (typeof WEEK_DAYS)[number]);
  if (targetIndex === -1) {
    return reference;
  }
  const monday = addDays(reference, -((reference.getDay() + 6) % 7));
  return addDays(monday, targetIndex);
}

function pairsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${count} пара`;
  }
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) {
    return `${count} пары`;
  }
  return `${count} пар`;
}

function matchingHomework(
  pair: ApiSchedulePair,
  homeworks: ApiHomework[],
): ApiHomework | undefined {
  return homeworks
    .filter(
      (hw) =>
        hw.schedule_pair_id === pair.id ||
        (hw.subject?.toLowerCase() === pair.subject.toLowerCase() &&
          (!hw.subgroup || hw.subgroup === pair.subgroup)),
    )
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    })[0];
}

function mapApiPairToLesson(
  pair: ApiSchedulePair,
  homeworks: ApiHomework[],
  reference: Date,
): Lesson {
  const matchingHw = matchingHomework(pair, homeworks);
  const date = weekdayDate(pair.day_of_week, reference);

  return {
    id: pair.id,
    date: localIsoDate(date),
    dayLabel: pair.day_of_week,
    time: pair.start_time.slice(0, 5),
    endTime: pair.end_time.slice(0, 5),
    subject: pair.subject,
    teacher: [pair.teacher_title, pair.teacher].filter(Boolean).join(" ") || "—",
    location: lessonLocationOf(pair) ?? "—",
    kind: lessonKindOf(pair) ?? "Практика",
    subgroup: (pair.subgroup as Subgroup) || "all",
    accent: ACCENTS[(pair.pair_number - 1) % ACCENTS.length],
    homework: matchingHw
      ? {
          id: matchingHw.id,
          description: matchingHw.description,
          dueDate: deadlineDate(matchingHw.deadline),
          subgroup: (matchingHw.subgroup as Subgroup) || "all",
        }
      : undefined,
  };
}

export function ScheduleDashboard(): React.JSX.Element {
  const today = useMemo(() => new Date(), []);
  const [selectedDay, setSelectedDay] = useState<string>(currentDayName(today));
  const [parity, setParity] = useState<WeekParityFilter>("all");
  const [subgroup, setSubgroup] = useState<Subgroup | "all">(1);
  const [view, setView] = useState<"day" | "week">("day");
  const [weekPairs, setWeekPairs] = useState<ApiSchedulePair[]>([]);
  const [homeworks, setHomeworks] = useState<ApiHomework[]>([]);
  const [groupName, setGroupName] = useState<string>("");
  const [canManage, setCanManage] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasGroup, setHasGroup] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);
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
    let cancelled = false;

    async function loadData(): Promise<void> {
      const user = await api.getMe();
      if (cancelled) {
        return;
      }
      if (!user) {
        return;
      }

      const scope = { group_id: user.group_id || undefined };
      setCanManage(canManageHomework(user));
      setSubgroup(user.subgroup_number === 2 ? 2 : 1);

      if (!user.group_id) {
        setHasGroup(false);
        setLoaded(true);
        return;
      }
      setHasGroup(true);

      const [weekPairs_, homeworkList] = await Promise.all([
        api.getWeekSchedule(scope).catch(() => []),
        api.getHomeworks({ group_id: scope.group_id }).catch(() => []),
      ]);
      if (cancelled) {
        return;
      }

      setWeekPairs(weekPairs_);
      setHomeworks(homeworkList);
      setGroupName(weekPairs_[0]?.group_name ?? "");
      setLoaded(true);

      const requestedLesson = new URLSearchParams(window.location.search).get("lesson");
      if (requestedLesson) {
        const pair = weekPairs_.find((item) => item.id === requestedLesson);
        if (pair) {
          setSelectedDay(pair.day_of_week);
        }
        setFocusedId(requestedLesson);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!focusedId) {
      return;
    }
    document
      .getElementById(`lesson-${focusedId}`)
      ?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [focusedId, selectedDay, loaded]);

  useEffect(() => {
    if (savedMessage) {
      const timer = setTimeout(() => {
        setSavedMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [savedMessage]);

  const visibleHomeworks = useMemo(
    () =>
      homeworks.filter(
        (hw) => subgroup === "all" || !hw.subgroup || hw.subgroup === subgroup,
      ),
    [homeworks, subgroup],
  );

  const lessonsForDay = useCallback(
    (dayName: string): Lesson[] =>
      weekPairs
        .filter(
          (pair) =>
            pair.day_of_week === dayName && pairMatchesParity(pair, parity),
        )
        .map((pair) => mapApiPairToLesson(pair, visibleHomeworks, today))
        .filter(
          (lesson) =>
            lesson.subgroup === "all" ||
            subgroup === "all" ||
            lesson.subgroup === subgroup,
        ),
    [weekPairs, parity, visibleHomeworks, subgroup, today],
  );

  const dayLessons = useMemo(
    () => lessonsForDay(selectedDay),
    [lessonsForDay, selectedDay],
  );

  const upcomingHomeworks = useMemo(
    () =>
      [...visibleHomeworks]
        .sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline.localeCompare(b.deadline);
        })
        .slice(0, 3),
    [visibleHomeworks],
  );

  const weekStrip = useMemo(() => {
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    return WEEK_DAYS.map((dayName, index) => {
      const date = addDays(monday, index);
      return {
        dayName,
        date,
        label: shortDayName(date),
        dayNumber: date.getDate(),
        isToday: localIsoDate(date) === localIsoDate(today),
        hasHomework: lessonsForDay(dayName).some((lesson) => Boolean(lesson.homework)),
      };
    });
  }, [today, lessonsForDay]);

  const selectedDate = weekdayDate(selectedDay, today);

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

  async function handleSave(draft: HomeworkDraft): Promise<void> {
    const lesson = weekPairs.find((pair) => pair.id === draft.lessonId);
    const subject = draft.subject || lesson?.subject || "Домашнее задание";
    const deadlineVal = draft.noDeadline || !draft.dueDate ? null : deadlineToIso(draft.dueDate);
    const payload = {
      title: subject,
      description: draft.description,
      subject,
      deadline: deadlineVal,
      subgroup: draft.subgroup === "all" ? null : draft.subgroup,
      schedule_pair_id: UUID_PATTERN.test(draft.lessonId) ? draft.lessonId : undefined,
      is_personal: draft.isPersonal,
    };

    if (draft.id) {
      await api.updateHomework(draft.id, payload);
      setHomeworks((prev) =>
        prev.map((item) =>
          item.id === draft.id
            ? {
                ...item,
                title: subject,
                description: draft.description,
                subject,
                deadline: payload.deadline,
                subgroup: payload.subgroup,
              }
            : item,
        ),
      );
      setSavedMessage(`Задание для «${subject}» обновлено`);
      return;
    }

    const saved = await api.createHomework(payload);
    setHomeworks((prev) => [
      ...prev,
      {
        ...saved,
        description: draft.description,
        subject,
        deadline: payload.deadline,
        subgroup: payload.subgroup,
        schedule_pair_id: saved.schedule_pair_id ?? payload.schedule_pair_id ?? null,
      },
    ]);
    setSavedMessage(`Задание для «${subject}» сохранено`);
  }

  async function handleDelete(homeworkId: string): Promise<void> {
    await api.deleteHomework(homeworkId);
    setHomeworks((prev) => prev.filter((item) => item.id !== homeworkId));
    setSavedMessage("Задание удалено");
  }

  return (
    <div className="page-wrap">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {currentDayName(today)} · {formatDayCaption(today)}
          </p>
          <h1>Расписание</h1>
          <p className="page-subtitle">
            {[groupName || "Группа не выбрана", `${currentStudyWeek(today)} учебная неделя`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {canManage ? (
          <div className="header-actions">
            <button
              className="button button-secondary assistant-button"
              type="button"
              onClick={() =>
                setEditorState({ open: true, mode: "assistant", initialData: null })
              }
            >
              <Sparkles size={16} strokeWidth={1.8} />
              Zeta AI
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() =>
                setEditorState({ open: true, mode: "form", initialData: null })
              }
            >
              <Plus size={16} strokeWidth={2} />
              Добавить ДЗ
            </button>
          </div>
        ) : null}
      </header>

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

        <div className="segmented-control" role="group" aria-label="Неделя">
          <button
            className={parity === "all" ? "is-active" : ""}
            type="button"
            onClick={() => setParity("all")}
          >
            Все
          </button>
          <button
            className={parity === "numerator" ? "is-active" : ""}
            type="button"
            onClick={() => setParity("numerator")}
          >
            Числитель
          </button>
          <button
            className={parity === "denominator" ? "is-active" : ""}
            type="button"
            onClick={() => setParity("denominator")}
          >
            Знаменатель
          </button>
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
      </section>

      <div
        className="week-strip"
        aria-label={`Неделя ${weekStrip[0]?.dayNumber}–${weekStrip[6]?.dayNumber}`}
      >
        {weekStrip.map((day) => (
          <button
            className={day.dayName === selectedDay ? "is-active" : ""}
            type="button"
            key={day.date.toISOString()}
            onClick={() => setSelectedDay(day.dayName)}
            aria-label={`${day.dayName} ${day.dayNumber}`}
            aria-pressed={day.dayName === selectedDay}
          >
            <span>{day.label}</span>
            <strong>{day.dayNumber}</strong>
            {day.hasHomework ? <i aria-label="Есть домашнее задание" /> : null}
          </button>
        ))}
      </div>

      {view === "day" ? (
        <section className="day-layout">
          <div className="schedule-list">
            <div className="section-heading">
              <div>
                <h2>
                  {selectedDay}, {formatDayCaption(selectedDate)}
                </h2>
                <p>{pairsLabel(dayLessons.length)} в расписании</p>
              </div>
            </div>

            {!loaded ? (
              <p className="kanban-empty">Загружаем расписание…</p>
            ) : !hasGroup ? (
              <div
                className="onboarding-no-group-card"
                style={{
                  padding: "32px 24px",
                  textAlign: "center",
                  background: "var(--card-bg, #ffffff)",
                  borderRadius: "16px",
                  border: "1px dashed var(--border-color, #e2e8f0)",
                  margin: "12px 0",
                }}
              >
                <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>
                  У вас пока нет учебной группы
                </h2>
                <p
                  style={{
                    color: "var(--muted, #64748b)",
                    maxWidth: "480px",
                    margin: "0 auto 20px",
                    fontSize: "14px",
                  }}
                >
                  Чтобы видеть расписание занятий и актуальные домашние задания,
                  создайте свою группу или перейдите по ссылке-приглашению от старосты.
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <a href="/admin" className="button button-primary">
                    Создать группу
                  </a>
                </div>
              </div>
            ) : dayLessons.length === 0 ? (
              <p className="kanban-empty">На этот день пар нет</p>
            ) : (
              dayLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  focused={lesson.id === focusedId}
                  canManage={canManage}
                  onAddHomework={handleAddHomework}
                  onEditHomework={handleEditHomework}
                />
              ))
            )}
          </div>

          <aside className="upcoming-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Дедлайны</p>
                <h2>Ближайшие ДЗ</h2>
              </div>
              <span className="count-badge">{upcomingHomeworks.length}</span>
            </div>

            {upcomingHomeworks.length === 0 ? (
              <p className="kanban-empty">Дедлайнов пока нет</p>
            ) : (
              upcomingHomeworks.map((homework) => (
                <article className="upcoming-item" key={homework.id}>
                  <div className="date-tile accent-blue">
                    <strong>{Number(deadlineDate(homework.deadline).slice(8, 10))}</strong>
                    <span>
                      {formatDeadline(homework.deadline).split(" ")[1]?.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <strong>{homework.subject ?? homework.title}</strong>
                    <p>{homework.description}</p>
                    <span>{formatDeadline(homework.deadline)}</span>
                  </div>
                </article>
              ))
            )}

            <a className="text-link" href="/homework">
              Все задания <ChevronRight size={15} strokeWidth={2} />
            </a>
          </aside>
        </section>
      ) : (
        <section className="week-grid" aria-label="Расписание на неделю">
          {WEEK_DAYS.map((dayName) => {
            const dayLessonsForGrid = lessonsForDay(dayName);
            return (
              <div
                className={dayName === selectedDay ? "week-column is-current" : "week-column"}
                key={dayName}
              >
                <div className="week-column-title">
                  <span>{dayName}</span>
                  <strong>{weekdayDate(dayName, today).getDate()}</strong>
                </div>
                {dayLessonsForGrid.length === 0 ? (
                  <p className="kanban-empty">Пар нет</p>
                ) : (
                  dayLessonsForGrid.map((lesson) => (
                    <article className={`week-lesson accent-${lesson.accent}`} key={`${dayName}-${lesson.id}`}>
                      <span>{lesson.time}</span>
                      <strong>{lesson.subject}</strong>
                      <small>{lesson.location}</small>
                      {lesson.homework ? (
                        <BookOpen size={14} strokeWidth={1.8} aria-label="Есть домашнее задание" />
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            );
          })}
        </section>
      )}

      {savedMessage ? <div className="toast" role="status">{savedMessage}</div> : null}
      <HomeworkEditor
        open={editorState.open}
        lessons={dayLessons}
        initialMode={editorState.mode}
        initialData={editorState.initialData}
        onClose={() => setEditorState({ open: false, mode: "form", initialData: null })}
        onSave={handleSave}
        onDelete={canManage ? handleDelete : undefined}
        onParse={canManage ? api.parseHomework : undefined}
      />
    </div>
  );
}
