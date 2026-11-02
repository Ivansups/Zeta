"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";

import { lessons } from "@/lib/mock-data";
import type { HomeworkDraft, Subgroup } from "@/lib/types";

type HomeworkEditorProps = {
  open: boolean;
  initialData?: {
    id?: string;
    lessonId?: string;
    subgroup?: Subgroup | "all";
    description?: string;
    dueDate?: string;
  } | null;
  onClose: () => void;
  onSave: (draft: HomeworkDraft) => void;
};

function HomeworkEditorForm({
  initialData,
  onClose,
  onSave,
}: Omit<HomeworkEditorProps, "open">): React.JSX.Element {
  const isEdit = Boolean(initialData?.id);
  const [mode, setMode] = useState<"form" | "assistant">("form");

  const defaultLesson =
    lessons.find((lesson) => lesson.id === initialData?.lessonId) ?? lessons[0];

  const [lessonId, setLessonId] = useState(initialData?.lessonId ?? defaultLesson.id);
  const [subgroup, setSubgroup] = useState<Subgroup | "all">(
    initialData?.subgroup ?? defaultLesson.subgroup,
  );
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate ?? defaultLesson.date,
  );
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [errors, setErrors] = useState<{ description?: string; dueDate?: string }>({});

  const selectedLesson = lessons.find((lesson) => lesson.id === lessonId) ?? lessons[0];

  function resetAndClose(): void {
    setMode("form");
    setDescription("");
    setErrors({});
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const newErrors: { description?: string; dueDate?: string } = {};

    if (!description.trim()) {
      newErrors.description = "Добавьте описание задания";
    }

    if (mode === "form" && !dueDate.trim()) {
      newErrors.dueDate = "Укажите дату сдачи";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      lessonId,
      subgroup,
      dueDate: dueDate.trim() || selectedLesson.date,
      description: description.trim(),
    });
    resetAndClose();
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
            <p className="eyebrow">{isEdit ? "Редактирование" : "Новое задание"}</p>
            <h2 id="homework-editor-title">
              {mode === "assistant"
                ? "Черновик с Zeta AI"
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
            onClick={() => setMode("form")}
          >
            Вручную
          </button>
          <button
            className={mode === "assistant" ? "is-active" : ""}
            type="button"
            onClick={() => setMode("assistant")}
          >
            <Sparkles size={15} />
            С помощником
          </button>
        </div>

        <form className="editor-form" onSubmit={handleSubmit}>
          {mode === "form" ? (
            <>
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
                {selectedLesson.dayLabel} · {selectedLesson.time}–{selectedLesson.endTime}
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

              <label className="field-label" htmlFor="dueDate">
                Дата сдачи
              </label>
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
            </>
          ) : (
            <>
              <div className="assistant-note">
                <Sparkles size={18} />
                <p>Опишите задание своими словами. Черновик появится перед сохранением.</p>
              </div>
              <label className="field-label" htmlFor="description">
                Текст для разбора
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }}
                placeholder="Например: по матану решить номера 12–18 к четвергу"
                rows={7}
                aria-describedby={errors.description ? "description-error" : undefined}
              />
            </>
          )}

          {errors.description ? (
            <p className="field-error" id="description-error" role="alert">
              {errors.description}
            </p>
          ) : null}

          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={resetAndClose}>
              Отмена
            </button>
            <button className="button button-primary" type="submit">
              {mode === "assistant"
                ? "Создать черновик"
                : isEdit
                  ? "Сохранить изменения"
                  : "Сохранить ДЗ"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function HomeworkEditor({
  open,
  initialData,
  onClose,
  onSave,
}: HomeworkEditorProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  const key = `${initialData?.id ?? "new"}-${initialData?.lessonId ?? "default"}`;

  return (
    <HomeworkEditorForm
      key={key}
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
