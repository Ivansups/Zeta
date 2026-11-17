import { BookOpen, GraduationCap, MapPin } from "lucide-react";

import type { Lesson } from "@/lib/types";

export function LessonCard({ lesson }: { lesson: Lesson }): React.JSX.Element {
  return (
    <article className={`lesson-card accent-${lesson.accent}`}>
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
          <span><MapPin size={14} strokeWidth={1.8} />{lesson.location}</span>
          <span><GraduationCap size={14} strokeWidth={1.8} />{lesson.teacher}</span>
        </p>
        {lesson.homework ? (
          <div className="homework-inline">
            <BookOpen size={16} strokeWidth={1.8} />
            <div>
              <strong>Домашнее задание</strong>
              <p>{lesson.homework.description}</p>
            </div>
          </div>
        ) : (
          <p className="no-homework">Домашнего задания пока нет</p>
        )}
      </div>
    </article>
  );
}
