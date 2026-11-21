"use client";

import { useEffect, useState } from "react";

import { api, type ApiUser } from "@/lib/api";
import { students } from "@/lib/mock-data";
import type { Student, Subgroup } from "@/lib/types";

import { CreateGroupCard } from "./admin/create-group-card";
import { InviteCard, type Invitation } from "./admin/invite-card";
import { StudentsList } from "./admin/students-list";

type Tab = "invites" | "students" | "create_group";

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

export function AdminPanel(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>("invites");
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [studentRoles, setStudentRoles] = useState<ReadonlyMap<string, Student["role"]>>(
    () => new Map(students.map((student) => [student.id, student.role])),
  );
  const [sequence, setSequence] = useState(0);
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        const user = await api.getMe();
        if (user?.role === "elder" || user?.role === "admin") {
          const remoteInvites = await api.listInvites().catch(() => []);
          if (remoteInvites.length > 0) {
            setInvitations((prev) =>
              prev.map((item) => {
                const found = remoteInvites.find(
                  (inv) => inv.subgroup_number === item.subgroup,
                );
                return found
                  ? {
                      subgroup: item.subgroup,
                      link: `${window.location.origin}${found.invite_url}`,
                    }
                  : item;
              }),
            );
          }
        }
      } catch {
      }
    }
    void loadData();
  }, []);

  function createInvitation(subgroup: Subgroup): void {
    const nextSequence = sequence + 1;
    setSequence(nextSequence);
    const link = invitationLink(subgroup, nextSequence);

    setInvitations((current) =>
      current.map((invitation) =>
        invitation.subgroup === subgroup ? { ...invitation, link } : invitation,
      ),
    );
    setFeedback(`Ссылка для подгруппы ${subgroup} создана`);

    void api.createStudentInvite(subgroup).then((resp) => {
      if (resp?.invite_url) {
        setInvitations((current) =>
          current.map((inv) =>
            inv.subgroup === subgroup
              ? { ...inv, link: `${window.location.origin}${resp.invite_url}` }
              : inv,
          ),
        );
      }
    }).catch(() => {
    });
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
        <button
          className={`admin-tab-btn${activeTab === "create_group" ? " is-active" : ""}`}
          id="create-group-tab"
          type="button"
          role="tab"
          aria-controls="create-group-panel"
          aria-selected={activeTab === "create_group"}
          onClick={() => setActiveTab("create_group")}
        >
          Создать группу
          {activeTab === "create_group" ? <span className="admin-tab-indicator" aria-hidden="true" /> : null}
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
      ) : activeTab === "students" ? (
        <div id="students-panel" role="tabpanel" aria-labelledby="students-tab">
          <StudentsList studentRoles={studentRoles} onMakeHead={makeHead} />
        </div>
      ) : (
        <div id="create-group-panel" role="tabpanel" aria-labelledby="create-group-tab">
          <CreateGroupCard
            onSuccess={(groupName) => {
              setFeedback(`Группа «${groupName}» успешно создана! Вы назначены старостой.`);
              setActiveTab("invites");
            }}
          />
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {feedback}
      </p>
    </div>
  );
}
