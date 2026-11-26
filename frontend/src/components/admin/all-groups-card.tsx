"use client";

import { useState } from "react";

import type { ApiGroupAdminSummary } from "@/lib/api";

interface AllGroupsCardProps {
  groups: ApiGroupAdminSummary[];
  activeGroupId?: string | null;
  onSelectGroup: (groupId: string) => void;
  onSetElder: (groupId: string, userId: string) => Promise<void>;
  loading?: boolean;
}

export function AllGroupsCard({
  groups,
  activeGroupId,
  onSelectGroup,
  onSetElder,
  loading = false,
}: AllGroupsCardProps): React.JSX.Element {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newElderUserId, setNewElderUserId] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleElderSubmit(groupId: string): Promise<void> {
    if (!newElderUserId.trim()) return;
    setSubmitting(true);
    try {
      await onSetElder(groupId, newElderUserId.trim());
      setEditingGroupId(null);
      setNewElderUserId("");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="kanban-empty">Загрузка списка групп...</p>;
  }

  if (groups.length === 0) {
    return <p className="kanban-empty">На платформе пока нет созданных групп.</p>;
  }

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <header style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
          Все академические группы
        </h2>
        <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          Управление группами платформы, выбор контекста и назначение старост.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {groups.map((grp) => {
          const isSelected = grp.id === activeGroupId;
          const elderName = grp.elder
            ? grp.elder.display_name || grp.elder.username || `ID ${grp.elder.telegram_id}`
            : "Не назначен";

          const helpersList =
            grp.helpers && grp.helpers.length > 0
              ? grp.helpers
                  .map((h) => h.display_name || h.username || `ID ${h.telegram_id}`)
                  .join(", ")
              : "Нет";

          return (
            <div
              key={grp.id}
              data-testid={`group-row-${grp.id}`}
              style={{
                border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                backgroundColor: isSelected ? "var(--color-surface-hover)" : "var(--color-surface)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                    {grp.name}
                    {isSelected ? (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: "var(--color-primary)",
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        Активная группа
                      </span>
                    ) : null}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--color-muted)" }}>
                    {[grp.faculty, grp.university].filter(Boolean).join(" · ") || "Факультет не указан"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSelectGroup(grp.id)}
                    aria-label={`Выбрать группу ${grp.name}`}
                  >
                    {isSelected ? "Выбрана" : "Управлять"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingGroupId(editingGroupId === grp.id ? null : grp.id);
                      setNewElderUserId("");
                    }}
                    aria-label={`Сменить старосту ${grp.name}`}
                  >
                    Сменить старосту
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                  backgroundColor: "var(--color-background)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div>
                  <strong>Староста: </strong>
                  <span>{elderName}</span>
                </div>
                <div>
                  <strong>Хелперы: </strong>
                  <span>{helpersList}</span>
                </div>
                <div>
                  <strong>Студентов: </strong>
                  <span>{grp.students_count}</span>
                </div>
              </div>

              {editingGroupId === grp.id ? (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    marginTop: "0.5rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px dashed var(--color-border)",
                  }}
                >
                  <input
                    type="text"
                    className="input"
                    placeholder="UUID пользователя для назначения старостой"
                    value={newElderUserId}
                    onChange={(e) => setNewElderUserId(e.target.value)}
                    style={{ flex: 1, fontSize: "0.85rem" }}
                    aria-label="UUID нового старосты"
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={submitting || !newElderUserId.trim()}
                    onClick={() => handleElderSubmit(grp.id)}
                  >
                    {submitting ? "Назначаем..." : "Назначить"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingGroupId(null)}
                  >
                    Отмена
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
