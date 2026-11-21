"use client";

import { ShieldCheck } from "lucide-react";
import { students } from "@/lib/mock-data";
import type { Student } from "@/lib/types";

export function StudentCard({
  student,
  role,
  onMakeHead,
}: {
  student: Student;
  role: "Староста" | "Студент";
  onMakeHead: (student: Student) => void;
}): React.JSX.Element {
  const isHead = role === "Староста";

  return (
    <article
      className="student-card"
      aria-label={student.name}
      role="listitem"
    >
      <div className="student-profile">
        <span className={`student-avatar student-avatar-${student.color}`} aria-hidden="true">
          {student.initials}
        </span>
        <div className="student-details">
          <h3>{student.name}</h3>
          <p>Подгруппа {student.subgroup}</p>
        </div>
      </div>

      <div className="student-actions">
        <span className={`student-role ${isHead ? "is-head" : ""}`}>{role}</span>
        {isHead ? (
          <span className="current-head-badge">
            <ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
            Действующий староста
          </span>
        ) : (
          <button
            className="button button-secondary button-small"
            type="button"
            aria-label={`Назначить старостой: ${student.name}`}
            onClick={() => onMakeHead(student)}
          >
            Сделать старостой
          </button>
        )}
      </div>
    </article>
  );
}

export function StudentsList({
  studentRoles,
  onMakeHead,
}: {
  studentRoles: ReadonlyMap<string, Student["role"]>;
  onMakeHead: (student: Student) => void;
}): React.JSX.Element {
  return (
    <section aria-labelledby="students-title">
      <div className="section-heading">
        <div>
          <h2 id="students-title">Участники группы</h2>
          <p>Роли и распределение по подгруппам</p>
        </div>
        <span className="count-badge">{students.length} участников</span>
      </div>

      <ul className="students-card">
        {students.map((student) => {
          const role = studentRoles.get(student.id) ?? student.role;
          return (
            <li
              className="student-row"
              key={student.id}
              aria-label={student.name}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <span
                  className={`avatar avatar-${student.color}`}
                  aria-hidden="true"
                >
                  {student.initials}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>{student.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>Подгруппа {student.subgroup}</p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <span className={`role-badge ${role === "Староста" ? "head" : "student"}`}>
                  {role === "Староста" ? <ShieldCheck size={14} aria-hidden="true" /> : null}
                  {role}
                </span>
                {role === "Студент" ? (
                  <button
                    className="button button-secondary"
                    style={{ minHeight: "34px", fontSize: "12px", padding: "0 12px" }}
                    type="button"
                    aria-label={`Назначить старостой: ${student.name}`}
                    onClick={() => onMakeHead(student)}
                  >
                    Назначить старостой
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
