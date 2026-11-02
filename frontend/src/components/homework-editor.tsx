"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";

import { lessons } from "@/lib/mock-data";
import type { HomeworkDraft } from "@/lib/types";

type HomeworkEditorProps = {
  open: boolean;
  onClose: () => void;
  onSave: (draft: HomeworkDraft) => void;
};

export function HomeworkEditor({
  open,
  onClose,
  onSave,
}: HomeworkEditorProps): React.JSX.Element | null {
  const [mode, setMode] = useState<"form" | "assistant">("form");
  const [lessonId, setLessonId] = useState(lessons[0].id);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  const selectedLesson = lessons.find((lesson) => lesson.id === lessonId) ?? lessons[0];

  function resetAndClose(): void {
    setMode("form");
    setDescription("");
    setError("");
    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!description.trim()) {
      setError("Добавьте описание задания");
      return;
    }

    onSave({ lessonId, description: description.trim() });
    setMode("form");
    setDescription("");
    setError("");
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
            <p className="eyebrow">Новое задание</p>
            <h2 id="homework-editor-title">
              {mode === "form" ? "Создать ДЗ" : "Черновик с Zeta AI"}
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
                  onChange={(event) => setLessonId(event.target.value)}
                >
                  {lessons.slice(0, 5).map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.subject}
                    </option>
                  ))}
                </select>
                <div className="picker-fade picker-fade-bottom" />
              </div>
              <p className="picker-caption">
                {selectedLesson.dayLabel} · {selectedLesson.time}–{selectedLesson.endTime}
              </p>

              <label className="field-label" htmlFor="description">
                Описание задания
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setError("");
                }}
                placeholder="Что нужно сделать к следующей паре?"
                rows={5}
                aria-describedby={error ? "description-error" : undefined}
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
                  setError("");
                }}
                placeholder="Например: по матану решить номера 12–18 к четвергу"
                rows={7}
                aria-describedby={error ? "description-error" : undefined}
              />
            </>
          )}

          {error ? (
            <p className="field-error" id="description-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={resetAndClose}>
              Отмена
            </button>
            <button className="button button-primary" type="submit">
              {mode === "form" ? "Сохранить ДЗ" : "Создать черновик"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
