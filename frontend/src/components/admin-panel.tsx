"use client";

import { Check, Copy, Link2, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useRef, useState } from "react";

import { students } from "@/lib/mock-data";
import type { Student, Subgroup } from "@/lib/types";

type Tab = "invites" | "students";

type Invitation = {
  subgroup: Subgroup;
  link: string | null;
};

const initialInvitations: Invitation[] = [
  { subgroup: 1, link: null },
  { subgroup: 2, link: null },
];

function invitationLink(subgroup: Subgroup, sequence: number): string {
  return `https://zeta.study/invite/pi-221-${subgroup}-${sequence}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue with the selection-based fallback for restricted webviews.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function InviteCard({
  invitation,
  onCreate,
  onCopy,
  onRevoke,
}: {
  invitation: Invitation;
  onCreate: (subgroup: Subgroup) => void;
  onCopy: (subgroup: Subgroup, link: string) => void;
  onRevoke: (subgroup: Subgroup) => void;
}): React.JSX.Element {
  const { subgroup, link } = invitation;

  return (
    <article className="invite-card">
      <div className="invite-card-header">
        <span className="invite-card-icon" aria-hidden="true">
          <UserRound size={20} strokeWidth={1.75} />
        </span>
        <div>
          <h2>Подгруппа {subgroup}</h2>
          <p>Многоразовая ссылка для студентов подгруппы</p>
        </div>
      </div>

      {link ? (
        <div style={{ marginTop: "16px" }}>
          <label className="sr-only" htmlFor={`invite-${subgroup}`}>
            Ссылка для подгруппы {subgroup}
          </label>
          <div className="invite-input-row">
            <input
              id={`invite-${subgroup}`}
              readOnly
              value={link}
            />
            <button
              className="invite-input-copy-btn"
              type="button"
              aria-label={`Копировать ссылку для подгруппы ${subgroup}`}
              title="Копировать ссылку"
              onClick={() => onCopy(subgroup, link)}
            >
              <Copy size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="invite-meta-row">
            <span className="invite-active-badge">
              <Check size={15} aria-hidden="true" />
              Ссылка активна
            </span>
            <button
              className="invite-revoke-btn"
              type="button"
              onClick={() => onRevoke(subgroup)}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Отозвать ссылку для подгруппы {subgroup}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="button button-primary"
          style={{ width: "100%", marginTop: "20px" }}
          type="button"
          onClick={() => onCreate(subgroup)}
        >
          <Link2 size={16} aria-hidden="true" />
          Создать ссылку для подгруппы {subgroup}
        </button>
      )}
    </article>
  );
}

function StudentsList({
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

export function AdminPanel(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>("invites");
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [studentRoles, setStudentRoles] = useState<ReadonlyMap<string, Student["role"]>>(
    () => new Map(students.map((student) => [student.id, student.role])),
  );
  const [feedback, setFeedback] = useState("");
  const invitationSequence = useRef(0);

  function createInvitation(subgroup: Subgroup): void {
    invitationSequence.current += 1;
    const link = invitationLink(subgroup, invitationSequence.current);
    setInvitations((current) =>
      current.map((invitation) =>
        invitation.subgroup === subgroup ? { ...invitation, link } : invitation,
      ),
    );
    setFeedback(`Ссылка для подгруппы ${subgroup} создана`);
  }

  async function copyInvitation(subgroup: Subgroup, link: string): Promise<void> {
    if (await copyText(link)) {
      setFeedback(`Ссылка скопирована для подгруппы ${subgroup}`);
    } else {
      setFeedback("Не удалось скопировать ссылку");
    }
  }

  function revokeInvitation(subgroup: Subgroup): void {
    setInvitations((current) =>
      current.map((invitation) =>
        invitation.subgroup === subgroup ? { ...invitation, link: null } : invitation,
      ),
    );
    setFeedback(`Ссылка отозвана для подгруппы ${subgroup}`);
  }

  function makeHead(student: Student): void {
    setStudentRoles(
      new Map(students.map((item) => [item.id, item.id === student.id ? "Староста" : "Студент"])),
    );
    setFeedback(`${student.name} теперь староста`);
  }

  return (
    <div>
      <div className="admin-tabs" role="tablist" aria-label="Управление группой">
        <button
          className={`admin-tab-btn${activeTab === "invites" ? " is-active" : ""}`}
          id="invites-tab"
          type="button"
          role="tab"
          aria-controls="invites-panel"
          aria-selected={activeTab === "invites"}
          onClick={() => setActiveTab("invites")}
        >
          Приглашения
          {activeTab === "invites" ? <span className="admin-tab-indicator" aria-hidden="true" /> : null}
        </button>
        <button
          className={`admin-tab-btn${activeTab === "students" ? " is-active" : ""}`}
          id="students-tab"
          type="button"
          role="tab"
          aria-controls="students-panel"
          aria-selected={activeTab === "students"}
          onClick={() => setActiveTab("students")}
        >
          Студенты
          {activeTab === "students" ? <span className="admin-tab-indicator" aria-hidden="true" /> : null}
        </button>
      </div>

      {activeTab === "invites" ? (
        <section
          className="invite-grid"
          id="invites-panel"
          role="tabpanel"
          aria-labelledby="invites-tab"
        >
          {invitations.map((invitation) => (
            <InviteCard
              invitation={invitation}
              key={invitation.subgroup}
              onCopy={copyInvitation}
              onCreate={createInvitation}
              onRevoke={revokeInvitation}
            />
          ))}
        </section>
      ) : (
        <div id="students-panel" role="tabpanel" aria-labelledby="students-tab">
          <StudentsList studentRoles={studentRoles} onMakeHead={makeHead} />
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {feedback}
      </p>
    </div>
  );
}
