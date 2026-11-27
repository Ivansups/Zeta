"use client";

import { AlertCircle, ArrowRight, KeyRound, LoaderCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api";

/** Accept a raw token, a relative /invite/<token> link or a full URL. */
export function extractInviteToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      const inviteIndex = parts.indexOf("invite");
      return inviteIndex >= 0 ? parts[inviteIndex + 1] ?? "" : "";
    } catch {
      return "";
    }
  }

  const parts = trimmed.split("/").filter(Boolean);
  const inviteIndex = parts.indexOf("invite");
  return inviteIndex >= 0 ? parts[inviteIndex + 1] ?? "" : parts[0] ?? "";
}

function errorMessageOf(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function OnboardingCard(): React.JSX.Element {
  const router = useRouter();
  const [inviteInput, setInviteInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  function handleJoin(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const token = extractInviteToken(inviteInput);
    if (!token) {
      setJoinError("Введите код или ссылку-приглашение от старосты.");
      return;
    }
    setJoinError("");
    router.push(`/invite/${encodeURIComponent(token)}`);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = groupName.trim();
    if (name.length < 2) {
      setCreateError("Название группы должно быть не короче 2 символов.");
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      await api.createGroup({ name });
      window.dispatchEvent(new Event("user-updated"));
      // Full reload: the schedule and the group badge must pick up the new group.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch (err: unknown) {
      setCreateError(
        errorMessageOf(err, "Не удалось создать группу. Попробуйте ещё раз."),
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <header className="onboarding-header">
        <p className="eyebrow">Первый шаг</p>
        <h1 id="onboarding-title">Настройте учебную группу</h1>
        <p className="page-subtitle">
          Расписание и домашние задания привязаны к группе. Вступите по ссылке
          старосты или создайте новую группу, если вы староста.
        </p>
      </header>

      <div className="onboarding-grid">
        <article className="onboarding-panel">
          <span className="onboarding-icon" aria-hidden="true">
            <KeyRound size={20} strokeWidth={1.9} />
          </span>
          <h2>Вступить по коду старосты</h2>
          <p>
            Вставьте ссылку-приглашение или её код. Перед вступлением покажем
            группу, подгруппу и старосту.
          </p>
          <form className="onboarding-form" onSubmit={handleJoin}>
            <label htmlFor="onboarding-invite">Код или ссылка-приглашение</label>
            <input
              id="onboarding-invite"
              name="invite"
              type="text"
              autoComplete="off"
              placeholder="Например, /invite/abc123"
              value={inviteInput}
              onChange={(event) => setInviteInput(event.target.value)}
            />
            {joinError ? (
              <p className="onboarding-error" role="alert">
                <AlertCircle size={15} />
                {joinError}
              </p>
            ) : null}
            <button className="button button-primary" type="submit">
              Продолжить
              <ArrowRight size={17} />
            </button>
          </form>
        </article>

        <article className="onboarding-panel">
          <span className="onboarding-icon onboarding-icon-violet" aria-hidden="true">
            <Users size={20} strokeWidth={1.9} />
          </span>
          <h2>Я староста</h2>
          <p>
            Создайте группу и станьте её старостой. После этого вы сможете
            приглашать студентов и вести расписание.
          </p>
          <form className="onboarding-form" onSubmit={handleCreate}>
            <label htmlFor="onboarding-group-name">Название группы</label>
            <input
              id="onboarding-group-name"
              name="group-name"
              type="text"
              autoComplete="off"
              placeholder="Например, ИУ5-11Б"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />
            {createError ? (
              <p className="onboarding-error" role="alert">
                <AlertCircle size={15} />
                {createError}
              </p>
            ) : null}
            <button
              className="button button-secondary"
              type="submit"
              disabled={creating}
            >
              {creating ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Users size={17} />
              )}
              Создать группу
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
