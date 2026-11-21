"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { api, type ApiInvite, type ApiUser } from "@/lib/api";
import type { Student, Subgroup } from "@/lib/types";

import { CreateGroupCard } from "./admin/create-group-card";
import { InviteCard, type Invitation } from "./admin/invite-card";
import { StudentsList } from "./admin/students-list";

type Tab = "invites" | "students" | "create_group";

const COLORS = ["blue", "green", "coral", "violet"] as const;

function toStudent(user: ApiUser, index: number): Student {
  const name = user.display_name || user.username || `ID ${user.telegram_id}`;
  const roleName: Student["role"] =
    user.role === "elder"
      ? "Староста"
      : user.role === "helper"
        ? "Помощник"
        : "Студент";

  return {
    id: user.id,
    name,
    initials: name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join(""),
    subgroup: (user.subgroup_number as Subgroup) || 1,
    role: roleName,
    color: COLORS[index % COLORS.length],
  };
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
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("invites");
  const [invitations, setInvitations] = useState<Invitation[]>([
    { subgroup: 1, link: null },
    { subgroup: 2, link: null },
  ]);
  const [inviteIds, setInviteIds] = useState<ReadonlyMap<Subgroup, string>>(new Map());
  const [students, setStudents] = useState<Student[]>([]);
  const [studentRoles, setStudentRoles] = useState<ReadonlyMap<string, Student["role"]>>(
    new Map(),
  );
  const [canManage, setCanManage] = useState(false);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    async function loadData(): Promise<void> {
      const user = await api.getMe();
      if (!user) return;
      setCurrentUser(user);

      if (!user.group_id) {
        setActiveTab("create_group");
        return;
      }

      setActiveTab("invites");

      if (user.role !== "elder" && user.role !== "admin") {
        return;
      }
      setCanManage(true);

      const [remoteInvites, remoteUsers] = await Promise.all([
        api.listInvites().catch(() => [] as ApiInvite[]),
        api.listUsers().catch(() => [] as ApiUser[]),
      ]);

      setInvitations((current) =>
        current.map((invitation) => {
          const found = remoteInvites.find(
            (invite) => invite.subgroup_number === invitation.subgroup,
          );
          return found
            ? { subgroup: invitation.subgroup, link: found.invite_url }
            : invitation;
        }),
      );
      setInviteIds(
        new Map(
          remoteInvites
            .filter((invite) => invite.subgroup_number === 1 || invite.subgroup_number === 2)
            .map((invite) => [invite.subgroup_number as Subgroup, invite.id]),
        ),
      );

      const mapped = remoteUsers.map(toStudent);
      setStudents(mapped);
      setStudentRoles(new Map(mapped.map((student) => [student.id, student.role])));
    }
    void loadData();
  }, []);

  const showCreateGroupTab = !currentUser?.group_id || currentUser?.role === "admin";

  async function createInvitation(subgroup: Subgroup): Promise<void> {
    try {
      const invite = await api.createStudentInvite(subgroup);
      setInvitations((current) =>
        current.map((item) =>
          item.subgroup === subgroup ? { ...item, link: invite.invite_url } : item,
        ),
      );
      setInviteIds((current) => new Map(current).set(subgroup, invite.id));
      showToast(`Ссылка для подгруппы ${subgroup} создана`);
    } catch {
      showToast("Не удалось создать ссылку. Попробуй позже.");
    }
  }

  async function copyInvitation(subgroup: Subgroup, link: string): Promise<void> {
    if (await copyText(link)) {
      showToast(`Ссылка скопирована для подгруппы ${subgroup}`);
    } else {
      showToast("Не удалось скопировать ссылку");
    }
  }

  async function revokeInvitation(subgroup: Subgroup): Promise<void> {
    const inviteId = inviteIds.get(subgroup);
    if (!inviteId) {
      showToast("Активной ссылки для этой подгруппы нет");
      return;
    }
    try {
      await api.revokeInvite(inviteId);
      setInvitations((current) =>
        current.map((invitation) =>
          invitation.subgroup === subgroup ? { ...invitation, link: null } : invitation,
        ),
      );
      setInviteIds((current) => {
        const next = new Map(current);
        next.delete(subgroup);
        return next;
      });
      showToast(`Ссылка отозвана для подгруппы ${subgroup}`);
    } catch {
      showToast("Не удалось отозвать ссылку. Попробуй позже.");
    }
  }

  async function makeHead(student: Student): Promise<void> {
    try {
      await api.setUserRole(student.id, "elder");
      setStudentRoles(
        new Map(
          students.map((item) => [
            item.id,
            item.id === student.id ? "Староста" : "Студент",
          ]),
        ),
      );
      showToast(`${student.name} теперь староста`);
    } catch {
      showToast("Не удалось сменить старосту. Попробуй позже.");
    }
  }

  async function handleSetRole(
    student: Student,
    role: "elder" | "helper" | "student",
  ): Promise<void> {
    try {
      await api.setUserRole(student.id, role);
      const newRoleLabel: Student["role"] =
        role === "elder" ? "Староста" : role === "helper" ? "Помощник" : "Студент";
      setStudentRoles(
        new Map(
          students.map((item) => {
            if (role === "elder") {
              return [
                item.id,
                item.id === student.id
                  ? "Староста"
                  : item.id === currentUser?.id
                    ? "Студент"
                    : studentRoles.get(item.id) ?? item.role,
              ];
            }
            return [
              item.id,
              item.id === student.id ? newRoleLabel : studentRoles.get(item.id) ?? item.role,
            ];
          }),
        ),
      );
      showToast(`${student.name} теперь ${newRoleLabel.toLowerCase()}`);
    } catch {
      showToast("Не удалось изменить роль. Попробуй позже.");
    }
  }

  async function handleGroupCreated(groupName: string): Promise<void> {
    showToast(`Группа «${groupName}» успешно создана! Вы назначены старостой.`);
    const updated = await api.getMe();
    if (updated) {
      setCurrentUser(updated);
      setCanManage(true);
      setActiveTab("invites");
      const [remoteInvites, remoteUsers] = await Promise.all([
        api.listInvites().catch(() => [] as ApiInvite[]),
        api.listUsers().catch(() => [] as ApiUser[]),
      ]);
      setInvitations((current) =>
        current.map((invitation) => {
          const found = remoteInvites.find(
            (invite) => invite.subgroup_number === invitation.subgroup,
          );
          return found
            ? { subgroup: invitation.subgroup, link: found.invite_url }
            : invitation;
        }),
      );
      setInviteIds(
        new Map(
          remoteInvites
            .filter((invite) => invite.subgroup_number === 1 || invite.subgroup_number === 2)
            .map((invite) => [invite.subgroup_number as Subgroup, invite.id]),
        ),
      );
      const mapped = remoteUsers.map(toStudent);
      setStudents(mapped);
      setStudentRoles(new Map(mapped.map((s) => [s.id, s.role])));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("user-updated"));
      }
    }
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
        {showCreateGroupTab ? (
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
        ) : null}
      </div>

      {activeTab === "create_group" && showCreateGroupTab ? (
        <div id="create-group-panel" role="tabpanel" aria-labelledby="create-group-tab">
          <CreateGroupCard onSuccess={handleGroupCreated} />
        </div>
      ) : !canManage ? (
        <p className="kanban-empty">
          Управление доступно старосте и администратору группы.
        </p>
      ) : activeTab === "students" ? (
        <div id="students-panel" role="tabpanel" aria-labelledby="students-tab">
          <StudentsList
            students={students}
            studentRoles={studentRoles}
            onMakeHead={makeHead}
            onSetRole={handleSetRole}
          />
        </div>
      ) : (
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
      )}
    </div>
  );
}
