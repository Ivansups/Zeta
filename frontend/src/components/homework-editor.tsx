"use client";

import { ArrowLeft, LoaderCircle, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { ApiHomeworkPreview } from "@/lib/api";
import type { HomeworkDraft, Lesson, Subgroup } from "@/lib/types";

type HomeworkEditorProps = {
  open: boolean;
  lessons: Lesson[];
  initialMode?: "form" | "assistant";
  initialData?: {
    id?: string;
    lessonId?: string;
    subgroup?: Subgroup | "all";
    description?: string;
    dueDate?: string;
  } | null;
  onClose: () => void;
  onSave: (draft: HomeworkDraft) => Promise<void> | void;
  onDelete?: (homeworkId: string) => Promise<void> | void;
  onParse?: (text: string) => Promise<ApiHomeworkPreview>;
};

function HomeworkEditorForm({
  lessons,
  initialMode = "form",
  initialData,
  onClose,
  onSave,
  onDelete,
  onParse,
}: Omit<HomeworkEditorProps, "open">): React.JSX.Element {
  const isEdit = Boolean(initialData?.id);
  const [mode, setMode] = useState<"form" | "assistant">(initialMode);
  const [assistantStage, setAssistantStage] = useState<"input" | "preview">("input");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const defaultLesson =
    lessons.find((lesson) => lesson.id === initialData?.lessonId) ?? lessons[0];

  const [lessonId, setLessonId] = useState(initialData?.lessonId ?? defaultLesson?.id ?? "");
  const [subgroup, setSubgroup] = useState<Subgroup | "all">(
    initialData?.subgroup ?? defaultLesson?.subgroup ?? "all",
  );
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate ?? defaultLesson?.date ?? "",
  );
  const [noDeadline, setNoDeadline] = useState(!initialData?.dueDate && initialData !== undefined && initialData !== null);
  const [isPersonal, setIsPersonal] = useState(false);
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [errors, setErrors] = useState<{
    description?: string;
    dueDate?: string;
    assistantPrompt?: string;
  }>({});

  const selectedLesson = lessons.find((lesson) => lesson.id === lessonId) ?? lessons[0];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function resetAndClose(): void {
    setMode("form");
    setAssistantStage("input");
    setAssistantPrompt("");
    setDescription("");
    setErrors({});
    setSubmitError("");
    onClose();
  }

  function handleLessonChange(newLessonId: string): void {
    setLessonId(newLessonId);
    if (!isEdit && !initialData?.dueDate) {
      const lesson = lessons.find((item) => item.id === newLessonId);
      if (lesson) {
        setDueDate(lesson.date);
        if (lesson.subgroup !== "all") {
          setSubgroup(lesson.subgroup);
        }
      }
    }
  }

  async function handleAssistantParse(): Promise<void> {
    if (!assistantPrompt.trim()) {
      setErrors({ assistantPrompt: "Введите текст задания для разбора" });
      return;
    }
    if (!onParse) {
      setErrors({ assistantPrompt: "Ассистент сейчас недоступен" });
      return;
    }

    setParsing(true);
    setSubmitError("");
    try {
      const parsed = await onParse(assistantPrompt);
      const targetLesson = lessons.find((lesson) => lesson.subject === parsed.subject);
      if (targetLesson) {
        setLessonId(targetLesson.id);
      }
      if (parsed.subgroup === 1 || parsed.subgroup === 2) {
        setSubgroup(parsed.subgroup);
      } else {
        setSubgroup("all");
      }
      if (parsed.deadline) {
        setDueDate(parsed.deadline.slice(0, 10));
      }
      setDescription(parsed.description);
      setAssistantStage("preview");
      setErrors({});
    } catch (error) {
      setErrors({
        assistantPrompt:
          error instanceof Error ? error.message : "Не удалось разобрать текст",
      });
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (mode === "assistant" && assistantStage === "input") {
      await handleAssistantParse();
      return;
    }

    const newErrors: { description?: string; dueDate?: string } = {};

    if (!description.trim()) {
      newErrors.description = "Добавьте описание задания";
    }

    if (!noDeadline && !dueDate.trim()) {
      newErrors.dueDate = "Укажите дату сдачи или отметьте 'Без дедлайна'";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setSubmitError("");
    try {
      await onSave({
        ...(initialData?.id ? { id: initialData.id } : {}),
        lessonId,
        subgroup,
        dueDate: noDeadline ? null : (dueDate.trim() || selectedLesson?.date || ""),
        noDeadline,
        isPersonal,
        description: description.trim(),
      });
      resetAndClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Не удалось сохранить задание",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!onDelete || !initialData?.id) {
      return;
    }
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    setSaving(true);
    setSubmitError("");
    try {
      await onDelete(initialData.id);
      resetAndClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Не удалось удалить задание",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={resetAndClose}>
      <section
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="homework-editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">
              {mode === "assistant"
                ? assistantStage === "preview"
                  ? "Распознано с Zeta AI"
                  : "Zeta AI"
                : isEdit
                  ? "Редактирование"
                  : "Новое задание"}
            </p>
            <h2 id="homework-editor-title">
              {mode === "assistant"
                ? assistantStage === "preview"
                  ? "Предпросмотр черновика"
                  : "Черновик с Zeta AI"
                : isEdit
                  ? "Редактировать ДЗ"
                  : "Создать ДЗ"}
            </h2>
          </div>
          <button className="icon-button" type="button" onClick={resetAndClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>

        <div className="mode-switch" role="group" aria-label="Способ создания">
          <button
            className={mode === "form" ? "is-active" : ""}
            type="button"
            onClick={() => {
              setMode("form");
              setErrors({});
            }}
          >
            Вручную
          </button>
          <button
            className={mode === "assistant" ? "is-active" : ""}
            type="button"
            onClick={() => {
              setMode("assistant");
              setErrors({});
            }}
          >
            <Sparkles size={15} />
            С помощником
          </button>
        </div>

        <form className="editor-form" onSubmit={handleSubmit}>
          {mode === "assistant" && assistantStage === "input" ? (
            <>
              <div className="assistant-note">
                <Sparkles size={18} />
                <p>Опишите задание своими словами. Сервер распознает предмет, дату и задание.</p>
              </div>
              <label className="field-label" htmlFor="assistant-prompt">
                Текст для разбора
              </label>
              <textarea
                id="assistant-prompt"
                value={assistantPrompt}
                onChange={(event) => {
                  setAssistantPrompt(event.target.value);
                  setErrors((prev) => ({ ...prev, assistantPrompt: undefined }));
                }}
                placeholder="Например: по матану решить номера 12–18 к четвергу"
                rows={6}
                aria-describedby={errors.assistantPrompt ? "assistant-prompt-error" : undefined}
              />
              {errors.assistantPrompt ? (
                <p className="field-error" id="assistant-prompt-error" role="alert">
                  {errors.assistantPrompt}
                </p>
              ) : null}

              <div className="modal-actions">
                <button className="button button-secondary" type="button" onClick={resetAndClose}>
                  Отмена
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => void handleAssistantParse()}
                  disabled={parsing}
                >
                  {parsing ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
                  Разобрать текст
                </button>
              </div>
            </>
          ) : (
            <>
              {mode === "assistant" && assistantStage === "preview" ? (
                <div className="assistant-preview-banner">
                  <Sparkles size={18} />
                  <div>
                    <strong>Черновик распознан Zeta AI</strong>
                    <p>Проверьте распознанные поля и отредактируйте перед сохранением в расписание.</p>
                  </div>
                </div>
              ) : null}

              <label className="field-label" htmlFor="lesson">
                Пара
              </label>
              <div className="picker-frame">
                <div className="picker-fade picker-fade-top" />
                <select
                  id="lesson"
                  value={lessonId}
                  onChange={(event) => handleLessonChange(event.target.value)}
                >
                  {lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.subject} ({lesson.kind})
                    </option>
                  ))}
                </select>
                <div className="picker-fade picker-fade-bottom" />
              </div>
              <p className="picker-caption">
                {selectedLesson
                  ? `${selectedLesson.dayLabel} · ${selectedLesson.time}–${selectedLesson.endTime}`
                  : "Нет пар для привязки задания"}
              </p>

              <label className="field-label" htmlFor="subgroup">
                Подгруппа
              </label>
              <div className="picker-frame mb-3">
                <select
                  id="subgroup"
                  value={subgroup}
                  onChange={(event) => {
                    const val = event.target.value;
                    setSubgroup(val === "all" ? "all" : (Number(val) as Subgroup));
                  }}
                >
                  <option value="all">Вся группа</option>
                  <option value="1">Подгруппа 1</option>
                  <option value="2">Подгруппа 2</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", margin: "8px 0 12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                  <input
                    type="checkbox"
                    checked={isPersonal}
                    onChange={(e) => setIsPersonal(e.target.checked)}
                  />
                  Личная задача (только для меня)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="field-label" htmlFor="dueDate" style={{ margin: 0 }}>
                  Дата сдачи
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px", color: "var(--muted, #64748b)" }}>
                  <input
                    type="checkbox"
                    checked={noDeadline}
                    onChange={(e) => {
                      setNoDeadline(e.target.checked);
                      if (e.target.checked) setErrors((prev) => ({ ...prev, dueDate: undefined }));
                    }}
                  />
                  Без дедлайна
                </label>
              </div>
              {!noDeadline ? (
                <input
                  className="field-input"
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(event) => {
                    setDueDate(event.target.value);
                    setErrors((prev) => ({ ...prev, dueDate: undefined }));
                  }}
                  aria-describedby={errors.dueDate ? "dueDate-error" : undefined}
                />
              ) : null}
              {errors.dueDate ? (
                <p className="field-error" id="dueDate-error" role="alert">
                  {errors.dueDate}
                </p>
              ) : null}

              <label className="field-label" htmlFor="description">
                Описание задания
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }}
                placeholder="Что нужно сделать к следующей паре?"
                rows={5}
                aria-describedby={errors.description ? "description-error" : undefined}
              />
              {errors.description ? (
                <p className="field-error" id="description-error" role="alert">
                  {errors.description}
                </p>
              ) : null}

              {submitError ? (
                <p className="field-error" role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className="modal-actions">
                {isEdit && onDelete ? (
                  <button
                    className="button button-danger"
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={saving}
                  >
                    <Trash2 size={16} />
                    {confirmingDelete ? "Удалить безвозвратно" : "Удалить"}
                  </button>
                ) : null}
                {mode === "assistant" && assistantStage === "preview" ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setAssistantStage("input")}
                  >
                    <ArrowLeft size={16} />
                    Назад к вводу
                  </button>
                ) : (
                  <button className="button button-secondary" type="button" onClick={resetAndClose}>
                    Отмена
                  </button>
                )}
                <button className="button button-primary" type="submit" disabled={saving}>
                  {mode === "assistant"
                    ? "Сохранить в расписание"
                    : isEdit
                      ? "Сохранить изменения"
                      : "Сохранить ДЗ"}
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </div>
  );
}

export function HomeworkEditor({
  open,
  lessons,
  initialMode,
  initialData,
  onClose,
  onSave,
  onDelete,
  onParse,
}: HomeworkEditorProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  const key = `${initialMode ?? "form"}-${initialData?.id ?? "new"}-${initialData?.lessonId ?? "default"}`;

  return (
    <HomeworkEditorForm
      key={key}
      lessons={lessons}
      initialMode={initialMode}
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      onParse={onParse}
    />
  );
}
