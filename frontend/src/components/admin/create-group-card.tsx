"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";

export function CreateGroupCard({
  onSuccess,
}: {
  onSuccess: (groupName: string) => void;
}): React.JSX.Element {
  const [form, setForm] = useState({ name: "", faculty: "", university: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSubmitting(true);
      setError("");
      await api.createGroup({
        name: form.name.trim(),
        faculty: form.faculty.trim() || undefined,
        university: form.university.trim() || undefined,
      });
      onSuccess(form.name.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось создать группу");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="invite-card" style={{ maxWidth: "560px", margin: "20px auto" }}>
      <div className="invite-card-header">
        <span className="invite-card-icon" aria-hidden="true">
          <PlusCircle size={20} strokeWidth={1.75} />
        </span>
        <div>
          <h2>Создать новую учебную группу</h2>
          <p>Вы станете старостой этой группы и сможете приглашать одногруппников</p>
        </div>
      </div>

      {error ? (
        <div style={{ color: "var(--accent-red)", marginTop: "12px", fontSize: "14px" }}>
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 500 }}>
            Название группы *
          </label>
          <input
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)" }}
            placeholder="Например, ПИ-221"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 500 }}>
            Факультет / Институт
          </label>
          <input
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)" }}
            placeholder="Например, ФИТ"
            value={form.faculty}
            onChange={(e) => setForm({ ...form, faculty: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 500 }}>
            Университет
          </label>
          <input
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)" }}
            placeholder="Например, НИУ ВШЭ"
            value={form.university}
            onChange={(e) => setForm({ ...form, university: e.target.value })}
          />
        </div>

        <button
          className="button button-primary"
          type="submit"
          disabled={submitting}
          style={{ marginTop: "10px" }}
        >
          {submitting ? "Создание..." : "Зарегистрировать группу"}
        </button>
      </form>
    </article>
  );
}
