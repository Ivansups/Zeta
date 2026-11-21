"use client";

import { Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { api, type ApiUser } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  elder: "Староста",
  helper: "Помощник",
  curator: "Куратор",
  student: "Студент",
  admin: "Администратор",
};

export function GroupSettings(): React.JSX.Element | null {
  const { showToast } = useToast();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.getMe().then((remote) => {
      if (!cancelled) {
        setUser(remote);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLeave(): Promise<void> {
    setIsLeaving(true);
    setError(null);
    try {
      const updated = await api.leaveGroup();
      setUser(updated);
      setShowConfirm(false);
      showToast("Вы успешно покинули группу");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("user-updated"));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось покинуть группу";
      setError(message);
      showToast(message);
    } finally {
      setIsLeaving(false);
    }
  }

  if (loading) {
    return null;
  }

  const roleText = user?.role ? ROLE_LABELS[user.role] ?? user.role : "";
  const subgroupText = user?.subgroup_number ? `Подгруппа ${user.subgroup_number}` : null;
  const subtitle = [roleText, subgroupText].filter(Boolean).join(" · ");

  return (
    <div className="settings-group">
      {user?.group_id ? (
        <div className="settings-row static-row">
          <span className="settings-icon">
            <Users size={18} strokeWidth={1.75} />
          </span>
          <span>
            <strong>{user.group_name || "Учебная группа"}</strong>
            <small>{subtitle || "Участник группы"}</small>
          </span>
          <button
            className="button button-secondary"
            type="button"
            style={{ color: "var(--danger)" }}
            onClick={() => {
              setError(null);
              setShowConfirm(true);
            }}
          >
            Покинуть группу
          </button>
        </div>
      ) : (
        <div className="settings-row static-row">
          <span className="settings-icon">
            <Users size={18} strokeWidth={1.75} />
          </span>
          <span>
            <strong>Вы не состоите в учебной группе</strong>
            <small>Присоединитесь по ссылке от старосты или создайте новую группу</small>
          </span>
          <Link href="/admin" className="button button-secondary">
            Создать группу
          </Link>
        </div>
      )}

      {showConfirm ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-group-title"
        >
          <div className="modal-sheet">
            <div className="modal-header">
              <h2 id="leave-group-title">Покинуть группу</h2>
              <button
                className="icon-button"
                type="button"
                onClick={() => setShowConfirm(false)}
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 14 }}>
              Вы уверены, что хотите покинуть группу «{user?.group_name || "текущую группу"}»?
            </p>
            {error ? (
              <p
                className="form-error"
                role="alert"
                style={{ color: "var(--danger)", marginTop: 12, fontSize: 13 }}
              >
                {error}
              </p>
            ) : null}
            <div className="modal-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isLeaving}
              >
                Отмена
              </button>
              <button
                className="button button-danger"
                type="button"
                onClick={handleLeave}
                disabled={isLeaving}
              >
                {isLeaving ? "Выход..." : "Покинуть группу"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
