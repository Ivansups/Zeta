"use client";

import { BookOpen, ChevronRight, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api, type ApiHomework, type ApiSchedulePair } from "@/lib/api";
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

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekdayDate(dayName: string, reference: Date): Date {
  const targetIndex = WEEK_DAYS.indexOf(dayName as (typeof WEEK_DAYS)[number]);
  if (targetIndex === -1) {
    return reference;
  }
  const monday = addDays(reference, -((reference.getDay() + 6) % 7));
  return addDays(monday, targetIndex);
}

const KIND_MAP: Record<string, "Лекция" | "Практика" | "Лабораторная"> = {
  лек: "Лекция",
  прак: "Практика",
  лаб: "Лабораторная",
};

const ACCENTS = ["blue", "green", "coral", "violet"] as const;

function mapApiPairToLesson(
  pair: ApiSchedulePair,
  homeworks: ApiHomework[],
  reference: Date,
): Lesson {
  const matchingHw = homeworks.find(
    (hw) =>
      hw.schedule_pair_id === pair.id ||
      (hw.subject?.toLowerCase() === pair.subject.toLowerCase() &&
        (!hw.subgroup || hw.subgroup === pair.subgroup)),
  );
  const date = weekdayDate(pair.day_of_week, reference);
  const kind = (pair.lesson_type && KIND_MAP[pair.lesson_type.toLowerCase()]) || "Практика";

  return {
    id: pair.id,
    date: isoDate(date),
    dayLabel: pair.day_of_week,
    time: pair.start_time.slice(0, 5),
    endTime: pair.end_time.slice(0, 5),
    subject: pair.subject,
    teacher: [pair.teacher_title, pair.teacher].filter(Boolean).join(" ") || "—",
    location: pair.room ? `ауд. ${pair.room}` : pair.is_online ? "Онлайн" : "—",
    kind,
    subgroup: (pair.subgroup as Subgroup) || "all",
    accent: ACCENTS[(pair.pair_number - 1) % ACCENTS.length],
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
  const today = useMemo(() => new Date(), []);
  const [subgroup, setSubgroup] = useState<Subgroup>(1);
  const [view, setView] = useState<"day" | "week">("day");
  const [lessonList, setLessonList] = useState<Lesson[]>([]);
  const [weekLessons, setWeekLessons] = useState<Lesson[]>([]);
  const [homeworks, setHomeworks] = useState<ApiHomework[]>([]);
  const [groupName, setGroupName] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
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

      const scope = {
        group_id: user?.group_id || undefined,
        subgroup: user?.subgroup_number || undefined,
      };
      const [dayPairs, weekPairs, homeworkList] = await Promise.all([
        api
          .getDaySchedule({ day: currentDayName(new Date()), ...scope })
          .catch(() => []),
        api.getWeekSchedule(scope).catch(() => []),
        api.getHomeworks({ group_id: scope.group_id }).catch(() => []),
      ]);
      if (cancelled) {
        return;
      }

      const reference = new Date();
      setLessonList(dayPairs.map((pair) => mapApiPairToLesson(pair, homeworkList, reference)));
      setWeekLessons(weekPairs.map((pair) => mapApiPairToLesson(pair, homeworkList, reference)));
      setHomeworks(homeworkList);
      setGroupName(dayPairs[0]?.group_name ?? weekPairs[0]?.group_name ?? "");
      setLoaded(true);
    }

    void loadData();
    return () => {
      cancelled = true;
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
    () =>
      lessonList.filter(
        (lesson) => lesson.subgroup === "all" || lesson.subgroup === subgroup,
      ),
    [lessonList, subgroup],
  );

  const upcomingHomeworks = useMemo(
    () =>
      [...homeworks]
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .filter((homework) => !homework.subgroup || homework.subgroup === subgroup)
        .slice(0, 3),
    [homeworks, subgroup],
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
        isToday: isoDate(date) === isoDate(today),
        hasHomework: weekLessons.some(
          (lesson) =>
            lesson.dayLabel === dayName &&
            Boolean(lesson.homework) &&
            (lesson.subgroup === "all" || lesson.subgroup === subgroup),
        ),
      };
    });
  }, [today, weekLessons, subgroup]);

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
      prevLessons.map((item) =>
        item.id === draft.lessonId
          ? {
              ...item,
              homework: {
                id: draft.id || item.homework?.id || `hw-${draft.lessonId}`,
                description: draft.description,
                dueDate: draft.dueDate,
                subgroup: draft.subgroup,
              },
            }
          : item,
      ),
    );

    const lesson = lessonList.find((item) => item.id === draft.lessonId);
    setEditorState({ open: false, mode: "form", initialData: null });

    const deadlineIso = draft.dueDate
      ? `${draft.dueDate}T23:59:00Z`
      : new Date().toISOString();
    void api
      .createHomework({
        title: draft.subject || lesson?.subject || "Домашнее задание",
        description: draft.description,
        subject: draft.subject || lesson?.subject,
        deadline: deadlineIso,
        subgroup: draft.subgroup === "all" ? undefined : (draft.subgroup as number),
        schedule_pair_id: UUID_PATTERN.test(draft.lessonId) ? draft.lessonId : undefined,
      })
      .catch(() => {
        setSavedMessage("Не удалось сохранить задание. Попробуй позже.");
      });

    setSavedMessage(
      isEdit
        ? `Задание для «${lesson?.subject ?? "пары"}» обновлено`
        : `Задание для «${lesson?.subject ?? "пары"}» сохранено`,
    );
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

      <div
        className="week-strip"
        aria-label={`Неделя ${weekStrip[0]?.dayNumber}–${weekStrip[6]?.dayNumber}`}
      >
        {weekStrip.map((day) => (
          <button className={day.isToday ? "is-active" : ""} type="button" key={day.date.toISOString()}>
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
                  {currentDayName(today)}, {formatDayCaption(today)}
                </h2>
                <p>{visibleLessons.length} пары в расписании</p>
              </div>
            </div>

            {!loaded ? (
              <p className="kanban-empty">Загружаем расписание…</p>
            ) : visibleLessons.length === 0 ? (
              <p className="kanban-empty">На этот день пар нет</p>
            ) : (
              visibleLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
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
              upcomingHomeworks.map((homework) => {
                const deadline = new Date(homework.deadline);
                return (
                  <article className="upcoming-item" key={homework.id}>
                    <div className="date-tile accent-blue">
                      <strong>{deadline.getDate()}</strong>
                      <span>{formatDayCaption(deadline).split(" ")[1]?.slice(0, 3)}</span>
                    </div>
                    <div>
                      <strong>{homework.subject ?? homework.title}</strong>
                      <p>{homework.description}</p>
                      <span>{formatDayCaption(deadline)}</span>
                    </div>
                  </article>
                );
              })
            )}

            <a className="text-link" href="/homework">
              Все задания <ChevronRight size={15} strokeWidth={2} />
            </a>
          </aside>
        </section>
      ) : (
        <section className="week-grid" aria-label="Расписание на неделю">
          {WEEK_DAYS.map((dayName) => {
            const dayLessons = weekLessons.filter(
              (lesson) =>
                lesson.dayLabel === dayName &&
                (lesson.subgroup === "all" || lesson.subgroup === subgroup),
            );
            return (
              <div
                className={dayName === currentDayName(today) ? "week-column is-current" : "week-column"}
                key={dayName}
              >
                <div className="week-column-title">
                  <span>{dayName}</span>
                  <strong>{weekdayDate(dayName, today).getDate()}</strong>
                </div>
                {dayLessons.length === 0 ? (
                  <p className="kanban-empty">Пар нет</p>
                ) : (
                  dayLessons.map((lesson) => (
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
        lessons={lessonList}
        initialMode={editorState.mode}
        initialData={editorState.initialData}
        onClose={() => setEditorState({ open: false, mode: "form", initialData: null })}
        onSave={handleSave}
      />
    </div>
  );
}
