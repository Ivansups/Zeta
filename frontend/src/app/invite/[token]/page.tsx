"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, type ApiInvitePreview, type ApiUser } from "@/lib/api";

type Status = "loading" | "confirm" | "joining" | "success" | "error";

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  elder: "Староста",
  helper: "Помощник",
  curator: "Куратор",
  student: "Студент",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export default function InvitePage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";

  const [status, setStatus] = useState<Status>("loading");
  const [preview, setPreview] = useState<ApiInvitePreview | null>(null);
  const [me, setMe] = useState<ApiUser | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPreview(): Promise<void> {
      if (!token) {
        setStatus("error");
        setErrorMessage("Ссылка-приглашение не содержит токена.");
        return;
      }

      try {
        const [invitePreview, currentUser] = await Promise.all([
          api.getInvitePreview(token),
          api.getMeQuiet(),
        ]);
        if (cancelled) {
          return;
        }
        setPreview(invitePreview);
        setMe(currentUser);
        setStatus("confirm");
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить приглашение.",
        );
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (status !== "success") {
      return;
    }
    const timer = window.setTimeout(() => {
      router.push("/");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [status, router]);

  async function handleJoin(): Promise<void> {
    setJoinError("");
    setStatus("joining");
    try {
      const updated = await api.joinGroup(token);
      setUser(updated);
      setStatus("success");
      window.dispatchEvent(new Event("user-updated"));
    } catch (err: unknown) {
      setStatus("confirm");
      setJoinError(
        err instanceof Error
          ? err.message
          : "Не удалось вступить в группу по этому приглашению.",
      );
    }
  }

  const alreadyMember = Boolean(
    me?.group_id && preview?.group_id && me.group_id === preview.group_id,
  );
  const inAnotherGroup = Boolean(
    me?.group_id && preview?.group_id && me.group_id !== preview.group_id,
  );

  return (
    <main className="login-page">
      <div className="login-surface invite-surface">
        <div className="invite-badge" role="status">
          <KeyRound size={16} />
          <span>Приглашение в группу Zeta</span>
        </div>

        {status === "loading" ? (
          <div className="authenticating-status">
            <LoaderCircle className="spin" size={32} />
            <h2>Проверяем приглашение...</h2>
            <p className="login-copy">Загружаем данные учебной группы.</p>
          </div>
        ) : null}

        {status === "joining" ? (
          <div className="authenticating-status">
            <LoaderCircle className="spin" size={32} />
            <h2>Вступаем в группу...</h2>
            <p className="login-copy">Применяем настройки учебной группы.</p>
          </div>
        ) : null}

        {status === "success" ? (
          <div className="confirmed-status" role="status">
            <CheckCircle2 size={36} color="var(--accent-green, #10b981)" />
            <h2>Вы успешно вступили в группу!</h2>
            <p className="login-copy">
              {user?.group_name ? `Группа: «${user.group_name}»` : ""}
              {user?.subgroup_number
                ? ` (подгруппа ${user.subgroup_number})`
                : ""}
            </p>
            <p className="login-copy" style={{ marginTop: "8px" }}>
              Перенаправляем в расписание...
            </p>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="login-error-banner invite-error" role="alert">
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
            <div className="invite-actions">
              <Link className="button button-primary" href="/">
                На главную
              </Link>
              <Link className="button button-secondary" href="/login">
                Войти заново
              </Link>
            </div>
          </div>
        ) : null}

        {status === "confirm" && preview ? (
          <div className="invite-card">
            <div className="invite-card-heading">
              <span className="invite-card-icon" aria-hidden="true">
                <Users size={22} strokeWidth={1.9} />
              </span>
              <div>
                <p className="eyebrow">Вас приглашают в группу</p>
                <h1>{preview.group_name}</h1>
              </div>
            </div>

            <dl className="invite-details">
              <div>
                <dt>Староста</dt>
                <dd>{preview.elder_name || "Не указан"}</dd>
              </div>
              <div>
                <dt>Подгруппа</dt>
                <dd>
                  {preview.subgroup_number
                    ? preview.subgroup_number
                    : "Вся группа"}
                </dd>
              </div>
              <div>
                <dt>Роль</dt>
                <dd>{roleLabel(preview.role)}</dd>
              </div>
            </dl>

            {joinError ? (
              <div className="login-error-banner" role="alert">
                <AlertCircle size={18} />
                <span>{joinError}</span>
              </div>
            ) : null}

            {!me ? (
              <>
                <p className="login-copy">
                  Войдите через Telegram, чтобы присоединиться к группе.
                </p>
                <Link
                  className="button button-primary invite-join-button"
                  href={`/login?invite=${encodeURIComponent(token)}`}
                >
                  Войти и присоединиться
                  <ArrowRight size={18} />
                </Link>
              </>
            ) : alreadyMember ? (
              <div className="invite-notice" role="status">
                <CheckCircle2 size={18} />
                <span>Вы уже состоите в этой группе.</span>
              </div>
            ) : inAnotherGroup ? (
              <div className="invite-notice invite-notice-warning" role="alert">
                <AlertCircle size={18} />
                <span>
                  Вы уже состоите в другой группе. Чтобы присоединиться к этой,
                  сначала покиньте текущую группу в настройках.
                </span>
              </div>
            ) : (
              <button
                className="button button-primary invite-join-button"
                type="button"
                onClick={() => void handleJoin()}
              >
                Присоединиться к группе
                <ArrowRight size={18} />
              </button>
            )}

            <div className="invite-footer-links">
              {inAnotherGroup ? (
                <Link className="text-button" href="/settings">
                  Перейти в настройки
                </Link>
              ) : null}
              <Link className="text-button" href="/">
                Не сейчас
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
