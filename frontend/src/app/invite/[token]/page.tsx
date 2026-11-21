"use client";

import { AlertCircle, CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, type ApiUser } from "@/lib/api";

type Status = "checking" | "joining" | "success" | "error";

export default function InvitePage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";

  const [status, setStatus] = useState<Status>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleInvite(): Promise<void> {
      if (!token) {
        setStatus("error");
        setErrorMessage("Ссылка-приглашение не содержит токена.");
        return;
      }

      const me = await api.getMe();
      if (cancelled) return;

      if (!me) {
        // Not logged in -> forward to login page with invite query
        router.replace(`/login?invite=${encodeURIComponent(token)}`);
        return;
      }

      setUser(me);
      setStatus("joining");

      try {
        const updated = await api.joinGroup(token);
        if (cancelled) return;
        setUser(updated);
        setStatus("success");
        setTimeout(() => {
          router.push("/");
        }, 1200);
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Не удалось вступить в группу по этому приглашению.",
        );
      }
    }

    void handleInvite();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main className="login-page">
      <div className="login-surface" style={{ textAlign: "center" }}>
        <div
          className="invite-badge"
          role="status"
          style={{ justifyContent: "center", marginBottom: "20px" }}
        >
          <KeyRound size={16} />
          <span>Приглашение в группу Zeta</span>
        </div>

        {status === "checking" || status === "joining" ? (
          <div className="authenticating-status">
            <LoaderCircle className="spin" size={32} />
            <h2>
              {status === "checking"
                ? "Проверяем профиль..."
                : "Вступаем в группу..."}
            </h2>
            <p className="login-copy">Применяем настройки учебной группы...</p>
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
          <div className="login-error-banner" role="alert" style={{ flexDirection: "column", gap: "12px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <Link className="button button-primary" href="/">
                На главную
              </Link>
              <Link className="button button-secondary" href="/login">
                Войти заново
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
