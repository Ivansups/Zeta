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
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"
          aria-hidden="true"
        >
          <UserRound size={20} strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-950">Подгруппа {subgroup}</h2>
          <p className="mt-1 text-sm leading-5 text-zinc-500">
            Многоразовая ссылка для студентов подгруппы
          </p>
        </div>
      </div>

      {link ? (
        <div className="mt-5">
          <label className="sr-only" htmlFor={`invite-${subgroup}`}>
            Ссылка для подгруппы {subgroup}
          </label>
          <div className="flex min-w-0 items-stretch rounded-lg border border-zinc-200 bg-zinc-50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <input
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-zinc-700 outline-none"
              id={`invite-${subgroup}`}
              readOnly
              value={link}
            />
            <button
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-center text-zinc-500 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              type="button"
              aria-label={`Копировать ссылку для подгруппы ${subgroup}`}
              title="Копировать ссылку"
              onClick={() => onCopy(subgroup, link)}
            >
              <Copy size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Check size={15} aria-hidden="true" />
              Ссылка активна
            </span>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              type="button"
              onClick={() => onRevoke(subgroup)}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Отозвать ссылку для подгруппы {subgroup}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          type="button"
          onClick={() => onCreate(subgroup)}
        >
          <Link2 size={18} aria-hidden="true" />
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
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950" id="students-title">
            Участники группы
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Роли и распределение по подгруппам</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-zinc-600">{students.length} участников</span>
      </div>

      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        {students.map((student) => {
          const role = studentRoles.get(student.id) ?? student.role;
          return (
            <li
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              key={student.id}
              aria-label={student.name}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`avatar avatar-${student.color} flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700`}
                  aria-hidden="true"
                >
                  {student.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950">{student.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Подгруппа {student.subgroup}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span
                  className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${
                    role === "Староста"
                      ? "bg-blue-50 text-blue-800"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {role === "Староста" ? <ShieldCheck size={14} aria-hidden="true" /> : null}
                  {role}
                </span>
                {role === "Студент" ? (
                  <button
                    className="min-h-10 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
      <div className="mb-6 border-b border-zinc-200" role="tablist" aria-label="Управление группой">
        <div className="flex gap-6">
          <button
            className={`relative min-h-11 px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === "invites" ? "text-blue-700" : "text-zinc-500 hover:text-zinc-900"
            }`}
            id="invites-tab"
            type="button"
            role="tab"
            aria-controls="invites-panel"
            aria-selected={activeTab === "invites"}
            onClick={() => setActiveTab("invites")}
          >
            Приглашения
            {activeTab === "invites" ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700" aria-hidden="true" />
            ) : null}
          </button>
          <button
            className={`relative min-h-11 px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === "students" ? "text-blue-700" : "text-zinc-500 hover:text-zinc-900"
            }`}
            id="students-tab"
            type="button"
            role="tab"
            aria-controls="students-panel"
            aria-selected={activeTab === "students"}
            onClick={() => setActiveTab("students")}
          >
            Студенты
            {activeTab === "students" ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700" aria-hidden="true" />
            ) : null}
          </button>
        </div>
      </div>

      {activeTab === "invites" ? (
        <section
          className="grid gap-4 md:grid-cols-2"
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
