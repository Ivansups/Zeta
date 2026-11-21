import { BookOpen, GraduationCap, MapPin, Plus } from "lucide-react";

import { HomeworkDescription } from "@/components/homework-description";
import type { Lesson } from "@/lib/types";

export type LessonCardProps = {
  lesson: Lesson;
  focused?: boolean;
  canManage?: boolean;
  onAddHomework?: (lesson: Lesson) => void;
  onEditHomework?: (lesson: Lesson) => void;
};

export function LessonCard({
  lesson,
  focused = false,
  canManage = false,
  onAddHomework,
  onEditHomework,
}: LessonCardProps): React.JSX.Element {
  return (
    <article
      className={`lesson-card accent-${lesson.accent}${focused ? " is-focused" : ""}`}
      id={`lesson-${lesson.id}`}
      data-focused={focused ? "true" : undefined}
    >
      <div className="lesson-time">
        <strong>{lesson.time}</strong>
        <span>{lesson.endTime}</span>
      </div>
      <div className="lesson-main">
        <div className="lesson-heading">
          <div>
            <span className="lesson-kind">{lesson.kind}</span>
            <h3>{lesson.subject}</h3>
          </div>
          {lesson.subgroup === "all" ? (
            <span className="quiet-badge">Вся группа</span>
          ) : (
            <span className="quiet-badge">Подгруппа {lesson.subgroup}</span>
          )}
        </div>
        <p className="lesson-meta">
          <span>
            <MapPin size={14} strokeWidth={1.8} />
            {lesson.location}
          </span>
          <span>
            <GraduationCap size={14} strokeWidth={1.8} />
            {lesson.teacher}
          </span>
        </p>
        {lesson.homework ? (
          <div className="homework-inline">
            <BookOpen size={16} strokeWidth={1.8} />
            <div className="homework-inline-body">
              <div className="homework-inline-header">
                <strong>Домашнее задание</strong>
                {canManage && onEditHomework ? (
                  <button
                    className="homework-edit-btn"
                    type="button"
                    onClick={() => onEditHomework(lesson)}
                    aria-label={`Изменить задание для ${lesson.subject}`}
                  >
                    Изменить
                  </button>
                ) : null}
              </div>
              <HomeworkDescription text={lesson.homework.description} />
            </div>
          </div>
        ) : (
          <div className="lesson-homework-empty">
            <p className="no-homework">Домашнего задания пока нет</p>
            {canManage && onAddHomework ? (
              <button
                className="lesson-add-hw-btn"
                type="button"
                onClick={() => onAddHomework(lesson)}
                aria-label={`Добавить ДЗ к ${lesson.subject}`}
              >
                <Plus size={14} strokeWidth={2} />
                Добавить ДЗ
              </button>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
