"use client";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";

import { api, type ApiHomework, type ApiSchedulePair } from "@/lib/api";
import { lessons as fallbackLessons, weekDays } from "@/lib/mock-data";
import { getTelegramWebApp } from "@/lib/telegram-web-app";
import type { Lesson, Subgroup } from "@/lib/types";

import { LessonCard } from "./lesson-card";

type MiniAppStatus = "authenticating" | "ready" | "error";

type TelegramWebAppAuthResponse = {
  access_token: string;
  user: {
    display_name?: string | null;
    group_id?: string | null;
  };
};

const WEEKDAY_LABELS: Record<string, string> = {
  Пн: "Понедельник",
  Вт: "Вторник",
  Ср: "Среда",
  Чт: "Четверг",
  Пт: "Пятница",
  Сб: "Суббота",
  Вс: "Воскресенье",
};

const SWIPE_THRESHOLD_PX = 48;

const miniAppDays = weekDays.map((day) => ({
  ...day,
  isoDate: `2026-10-${day.date}`,
  label: `${WEEKDAY_LABELS[day.weekday] ?? day.weekday}, ${day.date} октября`,
}));

const DEFAULT_DAY_INDEX = Math.max(
  0,
  weekDays.findIndex((day) => day.active),
);

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

export function TelegramMiniApp(): React.JSX.Element {
  const [status, setStatus] = useState<MiniAppStatus>("authenticating");
  const [userName, setUserName] = useState("Студент");
  const [errorMessage, setErrorMessage] = useState("");
  const [initData, setInitData] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState(DEFAULT_DAY_INDEX);
  const [realLessons, setRealLessons] = useState<Lesson[] | null>(null);
  const touchStartX = useRef<number | null>(null);

  const authenticate = useCallback(async (rawInitData: string): Promise<void> => {
    setStatus("authenticating");
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/telegram/webapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ init_data: rawInitData }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(
          errorData.detail || "Не удалось авторизоваться через Telegram",
        );
      }

      const data = (await response.json()) as TelegramWebAppAuthResponse;
      setUserName(data.user?.display_name || "Студент");
      setStatus("ready");

      try {
        const dayName = WEEKDAY_LABELS[miniAppDays[DEFAULT_DAY_INDEX]?.weekday] || "Понедельник";
        const [pairs, homeworks] = await Promise.all([
          api.getDaySchedule({
            day: dayName,
            group_name: data.user?.group_id ? undefined : "ПИ-221",
            group_id: data.user?.group_id || undefined,
          }).catch(() => []),
          api.getHomeworks({ group_id: data.user?.group_id || undefined }).catch(() => []),
        ]);
        if (pairs.length > 0) {
          setRealLessons(pairs.map((p) => mapApiPairToLesson(p, homeworks)));
        }
      } catch {
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Ошибка авторизации через Telegram",
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      const webApp = getTelegramWebApp();

      if (!webApp) {
        setErrorMessage(
          "Откройте Zeta внутри Telegram — Mini App авторизуется автоматически.",
        );
        setStatus("error");
        return;
      }

      webApp.ready?.();
      webApp.expand?.();

      if (!webApp.initData) {
        setErrorMessage(
          "Telegram не передал данные авторизации. Перезапустите Mini App.",
        );
        setStatus("error");
        return;
      }

      setInitData(webApp.initData);
      await authenticate(webApp.initData);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [authenticate]);

  const selectedDay = miniAppDays[dayIndex];
  const dayLessons = useMemo(() => {
    if (realLessons && realLessons.length > 0) {
      return realLessons;
    }
    return fallbackLessons.filter((lesson) => lesson.date === selectedDay.isoDate);
  }, [realLessons, selectedDay.isoDate]);

  function moveDay(delta: number): void {
    setDayIndex((current) =>
      Math.min(miniAppDays.length - 1, Math.max(0, current + delta)),
    );
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>): void {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>): void {
    const startX = touchStartX.current;
    touchStartX.current = null;
    const endX = event.changedTouches[0]?.clientX;

    if (startX === null || endX === undefined) {
      return;
    }

    const delta = startX - endX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) {
      return;
    }

    moveDay(delta > 0 ? 1 : -1);
  }

  if (status !== "ready") {
    return (
      <div className="tg-app tg-app-status">
        <div className="tg-app-brand">
          <span className="brand-mark" aria-hidden="true">
            <Send size={18} />
          </span>
          <span>Zeta</span>
        </div>

        {status === "authenticating" ? (
          <div className="tg-state" role="status">
            <LoaderCircle className="spin" size={28} />
            <p>Проверяем данные Telegram и настраиваем профиль.</p>
          </div>
        ) : (
          <div className="tg-state" role="alert">
            <AlertCircle size={24} />
            <p>{errorMessage}</p>
            {initData ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void authenticate(initData)}
              >
                Повторить
              </button>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tg-app">
      <header className="tg-app-header">
        <div className="tg-app-brand">
          <span className="brand-mark" aria-hidden="true">
            <Send size={16} />
          </span>
          <span>Zeta</span>
        </div>
        <span className="tg-app-user">{userName}</span>
      </header>

      <main className="tg-app-main">
        <div className="tg-app-days" role="group" aria-label="Дни недели">
          {miniAppDays.map((day, index) => (
            <button
              key={day.isoDate}
              className={index === dayIndex ? "is-active" : ""}
              type="button"
              aria-label={day.label}
              aria-pressed={index === dayIndex}
              onClick={() => setDayIndex(index)}
            >
              <span>{day.weekday}</span>
              <strong>{day.date}</strong>
              {day.hasHomework ? <i aria-hidden="true" /> : null}
            </button>
          ))}
        </div>

        <section
          className="tg-day-panel"
          data-testid="tg-day-panel"
          aria-label={selectedDay.label}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <header className="tg-day-header">
            <div>
              <p className="eyebrow">{selectedDay.label}</p>
              <h1>Расписание</h1>
              <p className="page-subtitle">
                {dayLessons.length ? `${dayLessons.length} пары` : "Пар нет"}
              </p>
            </div>
            <div className="tg-day-buttons">
              <button
                className="icon-button"
                type="button"
                aria-label="Предыдущий день"
                disabled={dayIndex === 0}
                onClick={() => moveDay(-1)}
              >
                <ChevronLeft size={18} strokeWidth={1.8} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Следующий день"
                disabled={dayIndex === miniAppDays.length - 1}
                onClick={() => moveDay(1)}
              >
                <ChevronRight size={18} strokeWidth={1.8} />
              </button>
            </div>
          </header>

          <div className="cards-stack">
            {dayLessons.length ? (
              dayLessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))
            ) : (
              <div className="tg-empty-state">
                <p>На этот день занятий не запланировано</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
