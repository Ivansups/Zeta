"use client";

import { AlertCircle, Trash2, X } from "lucide-react";
import { useState } from "react";

import type { ApiSchedulePair, ApiSchedulePairCreate, ApiSchedulePairUpdate } from "@/lib/api";
import { WEEK_DAYS } from "@/lib/week";

const PAIR_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: "08:30", end: "10:05" },
  2: { start: "10:15", end: "11:50" },
  3: { start: "12:00", end: "13:35" },
  4: { start: "13:50", end: "15:25" },
  5: { start: "15:35", end: "17:10" },
  6: { start: "17:20", end: "18:55" },
  7: { start: "19:05", end: "20:40" },
};

export type SchedulePairEditorProps = {
  open: boolean;
  initialDay?: string;
  initialPair?: ApiSchedulePair | null;
  groupId?: string;
  onClose: () => void;
  onSave: (
    data: ApiSchedulePairCreate | ApiSchedulePairUpdate,
    pairId?: string,
  ) => Promise<void>;
  onDelete?: (pairId: string) => Promise<void>;
};

function PairFormContent({
  initialDay,
  initialPair,
  groupId,
  onClose,
  onSave,
  onDelete,
}: Omit<SchedulePairEditorProps, "open">): React.JSX.Element {
  const [dayOfWeek, setDayOfWeek] = useState(initialPair?.day_of_week || initialDay || "Понедельник");
  const [pairNumber, setPairNumber] = useState<number>(initialPair?.pair_number || 1);
  const [startTime, setStartTime] = useState(
    initialPair ? initialPair.start_time.slice(0, 5) : PAIR_TIMES[1].start,
  );
  const [endTime, setEndTime] = useState(
    initialPair ? initialPair.end_time.slice(0, 5) : PAIR_TIMES[1].end,
  );
  const [weekParity, setWeekParity] = useState<"both" | "numerator" | "denominator">(
    (initialPair?.week_parity?.toLowerCase() as "numerator" | "denominator" | "both") ||
      "both",
  );
  const [subgroup, setSubgroup] = useState<number | null>(initialPair?.subgroup ?? null);
  const [lessonType, setLessonType] = useState<string>(initialPair?.lesson_type || "lecture");
  const [subject, setSubject] = useState(initialPair?.subject || "");
  const [teacher, setTeacher] = useState(initialPair?.teacher || "");
  const [teacherTitle, setTeacherTitle] = useState(initialPair?.teacher_title || "");
  const [room, setRoom] = useState(initialPair?.room || "");
  const [isOnline, setIsOnline] = useState(Boolean(initialPair?.is_online));
  const [notes, setNotes] = useState(
    initialPair?.notes ? initialPair.notes.join(", ") : "",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handlePairNumberChange(num: number): void {
    setPairNumber(num);
    if (PAIR_TIMES[num]) {
      setStartTime(PAIR_TIMES[num].start);
      setEndTime(PAIR_TIMES[num].end);
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!subject.trim()) {
      setError("Укажите название предмета");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: ApiSchedulePairCreate = {
        group_id: groupId,
        day_of_week: dayOfWeek,
        pair_number: pairNumber,
        start_time: startTime,
        end_time: endTime,
        week_parity: weekParity,
        subgroup,
        subject: subject.trim(),
        teacher: teacher.trim() || null,
        teacher_title: teacherTitle.trim() || null,
        room: isOnline ? null : room.trim() || null,
        is_online: isOnline,
        lesson_type: lessonType,
        notes: notes
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean),
      };

      await onSave(payload, initialPair?.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить пару");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!initialPair?.id || !onDelete) return;
    if (!window.confirm("Удалить эту пару из расписания?")) return;

    setSaving(true);
    try {
      await onDelete(initialPair.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось удалить пару");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="modal-card"
        style={{ maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Конструктор расписания</p>
            <h2>{initialPair ? "Редактировать пару" : "Новая пара в расписании"}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div
            className="error-banner"
            style={{
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#dc2626",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label className="field-label">
              <span>День недели</span>
              <select
                className="input-select"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
              >
                {WEEK_DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              <span>Номер пары</span>
              <select
                className="input-select"
                value={pairNumber}
                onChange={(e) => handlePairNumberChange(Number(e.target.value))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <option key={num} value={num}>
                    Пара {num} ({PAIR_TIMES[num]?.start}–{PAIR_TIMES[num]?.end})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label className="field-label">
              <span>Начало</span>
              <input
                type="time"
                className="input-text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
              />
            </label>
            <label className="field-label">
              <span>Конец</span>
              <input
                type="time"
                className="input-text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
              />
            </label>
          </div>

          <div>
            <span
              className="field-label-text"
              style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}
            >
              Чётность недели
            </span>
            <div className="segmented-control" role="group" aria-label="Чётность">
              <button
                type="button"
                className={weekParity === "both" ? "is-active" : ""}
                onClick={() => setWeekParity("both")}
              >
                Каждую неделю
              </button>
              <button
                type="button"
                className={weekParity === "numerator" ? "is-active" : ""}
                onClick={() => setWeekParity("numerator")}
              >
                Числитель (I)
              </button>
              <button
                type="button"
                className={weekParity === "denominator" ? "is-active" : ""}
                onClick={() => setWeekParity("denominator")}
              >
                Знаменатель (II)
              </button>
            </div>
          </div>

          <div>
            <span
              className="field-label-text"
              style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}
            >
              Подгруппа
            </span>
            <div className="segmented-control" role="group" aria-label="Подгруппа">
              <button
                type="button"
                className={subgroup === null ? "is-active" : ""}
                onClick={() => setSubgroup(null)}
              >
                Вся группа (потоковая)
              </button>
              <button
                type="button"
                className={subgroup === 1 ? "is-active" : ""}
                onClick={() => setSubgroup(1)}
              >
                Подгруппа 1
              </button>
              <button
                type="button"
                className={subgroup === 2 ? "is-active" : ""}
                onClick={() => setSubgroup(2)}
              >
                Подгруппа 2
              </button>
            </div>
          </div>

          <div>
            <span
              className="field-label-text"
              style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}
            >
              Тип занятия
            </span>
            <div className="segmented-control" role="group" aria-label="Тип занятия">
              <button
                type="button"
                className={lessonType === "lecture" ? "is-active" : ""}
                onClick={() => setLessonType("lecture")}
              >
                Лекция
              </button>
              <button
                type="button"
                className={lessonType === "practice" ? "is-active" : ""}
                onClick={() => setLessonType("practice")}
              >
                Практика
              </button>
              <button
                type="button"
                className={lessonType === "seminar" ? "is-active" : ""}
                onClick={() => setLessonType("seminar")}
              >
                Семинар
              </button>
              <button
                type="button"
                className={lessonType === "lab" ? "is-active" : ""}
                onClick={() => setLessonType("lab")}
              >
                Лабораторная
              </button>
            </div>
          </div>

          <label className="field-label">
            <span>Предмет *</span>
            <input
              type="text"
              className="input-text"
              placeholder="Например, Математический анализ"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
            <label className="field-label">
              <span>Должность</span>
              <input
                type="text"
                className="input-text"
                placeholder="доц. / проф."
                value={teacherTitle}
                onChange={(e) => setTeacherTitle(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
              />
            </label>
            <label className="field-label">
              <span>Преподаватель</span>
              <input
                type="text"
                className="input-text"
                placeholder="Иванов И.И."
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
              <input
                type="checkbox"
                checked={isOnline}
                onChange={(e) => setIsOnline(e.target.checked)}
              />
              Дистанционный формат (онлайн)
            </label>
          </div>

          {!isOnline ? (
            <label className="field-label">
              <span>Аудитория / Корпус</span>
              <input
                type="text"
                className="input-text"
                placeholder="Например, ауд. 404, корпус 1"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
              />
            </label>
          ) : null}

          <label className="field-label">
            <span>Примечания (через запятую)</span>
            <input
              type="text"
              className="input-text"
              placeholder="ДО, ВУЦ, спецкурс"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "12px" }}>
            {initialPair && onDelete ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={handleDelete}
                disabled={saving}
                style={{ color: "var(--danger, #ef4444)" }}
              >
                <Trash2 size={16} />
                Удалить
              </button>
            ) : <div />}

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving ? "Сохранение…" : initialPair ? "Сохранить изменения" : "Добавить пару"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SchedulePairEditor(props: SchedulePairEditorProps): React.JSX.Element | null {
  if (!props.open) {
    return null;
  }

  const resetKey = props.initialPair ? props.initialPair.id : `new-${props.initialDay || "default"}`;

  return (
    <PairFormContent
      key={resetKey}
      initialDay={props.initialDay}
      initialPair={props.initialPair}
      groupId={props.groupId}
      onClose={props.onClose}
      onSave={props.onSave}
      onDelete={props.onDelete}
    />
  );
}
