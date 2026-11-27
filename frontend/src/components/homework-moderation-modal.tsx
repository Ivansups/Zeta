"use client";

import { AlertCircle, Check, X } from "lucide-react";
import { useState } from "react";

import type { ApiHomework } from "@/lib/api";

export type HomeworkModerationModalProps = {
  homework: ApiHomework | null;
  open: boolean;
  onClose: () => void;
  onModerate: (
    homeworkId: string,
    data: {
      action: "approve" | "reject";
      moderation_comment?: string;
      title?: string;
      description?: string;
      deadline?: string | null;
      subgroup?: number | null;
      subject?: string;
    },
  ) => Promise<void>;
};

export function HomeworkModerationModal({
  homework,
  open,
  onClose,
  onModerate,
}: HomeworkModerationModalProps): React.JSX.Element | null {
  const [title, setTitle] = useState(homework?.title || "");
  const [description, setDescription] = useState(homework?.description || "");
  const [subject, setSubject] = useState(homework?.subject || "");
  const [subgroup, setSubgroup] = useState<number | null>(homework?.subgroup ?? null);
  const [deadline, setDeadline] = useState(homework?.deadline ? homework.deadline.slice(0, 10) : "");
  const [noDeadline, setNoDeadline] = useState(!homework?.deadline);
  const [moderationComment, setModerationComment] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open || !homework) {
    return null;
  }

  async function handleApprove(): Promise<void> {
    if (!homework) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onModerate(homework.id, {
        action: "approve",
        title: title.trim() || homework.title,
        description: description.trim() || homework.description,
        subject: subject.trim() || undefined,
        subgroup,
        deadline: noDeadline ? null : deadline ? `${deadline}T12:00:00Z` : null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось одобрить задание");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(): Promise<void> {
    if (!homework) {
      return;
    }
    if (!moderationComment.trim()) {
      setError("Укажите причину отклонения для автора");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onModerate(homework.id, {
        action: "reject",
        moderation_comment: moderationComment.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отклонить задание");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="modal-card"
        style={{ maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Модерация старосты</p>
            <h2>Предложение задания в группу</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div
            className="error-banner"
            style={{
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#dc2626",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label className="field-label">
            <span>Предмет</span>
            <input
              type="text"
              className="input-text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
            />
          </label>

          <label className="field-label">
            <span>Название задания</span>
            <input
              type="text"
              className="input-text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
            />
          </label>

          <label className="field-label">
            <span>Описание задания</span>
            <textarea
              className="input-text"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <span className="field-label-text" style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                Подгруппа
              </span>
              <div className="segmented-control" role="group">
                <button
                  type="button"
                  className={subgroup === null ? "is-active" : ""}
                  onClick={() => setSubgroup(null)}
                >
                  Вся группа
                </button>
                <button
                  type="button"
                  className={subgroup === 1 ? "is-active" : ""}
                  onClick={() => setSubgroup(1)}
                >
                  Подгруппа 1
                </button>
                <button
                  type="button"
                  className={subgroup === 2 ? "is-active" : ""}
                  onClick={() => setSubgroup(2)}
                >
                  Подгруппа 2
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>Дата сдачи</span>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", cursor: "pointer", color: "var(--muted, #64748b)" }}>
                  <input
                    type="checkbox"
                    checked={noDeadline}
                    onChange={(e) => setNoDeadline(e.target.checked)}
                  />
                  Без срока
                </label>
              </div>
              {!noDeadline ? (
                <input
                  type="date"
                  className="input-text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: "8px" }}
                />
              ) : (
                <p style={{ fontSize: "13px", color: "var(--muted, #64748b)", padding: "6px 0" }}>
                  Будет помещено в бэклог (без срока)
                </p>
              )}
            </div>
          </div>

          {isRejecting ? (
            <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.05)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
              <label className="field-label">
                <span style={{ color: "#dc2626" }}>Причина отклонения для автора *</span>
                <textarea
                  className="input-text"
                  rows={3}
                  placeholder="Например: преподаватель отменил это ДЗ или задал другие номера"
                  value={moderationComment}
                  onChange={(e) => setModerationComment(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", marginTop: "4px" }}
                />
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsRejecting(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleReject}
                  disabled={saving}
                  style={{ background: "#dc2626", borderColor: "#dc2626" }}
                >
                  Подтвердить отклонение
                </button>
              </div>
            </div>
          ) : null}

          {!isRejecting ? (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "12px" }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIsRejecting(true)}
                style={{ color: "var(--danger, #ef4444)" }}
                disabled={saving}
              >
                Отклонить
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleApprove}
                  disabled={saving}
                >
                  <Check size={16} />
                  Одобрить и опубликовать
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
