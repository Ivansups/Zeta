"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  Code2,
  KeyRound,
  LoaderCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import {
  TelegramLoginButton,
  type TelegramUser,
} from "@/components/telegram-login-button";

type LoginState = "idle" | "authenticating" | "confirmed" | "error";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";

function LoginForm(): React.JSX.Element {
  const searchParams = useSearchParams();
  const inviteToken =
    searchParams?.get("invite") ||
    searchParams?.get("token") ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("invite") ||
        new URLSearchParams(window.location.search).get("token")
      : null);

  const [state, setState] = useState<LoginState>("idle");
  const [userName, setUserName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleTelegramAuth(user: TelegramUser): Promise<void> {
    try {
      setState("authenticating");
      setErrorMessage(null);

      const response = await fetch("/api/auth/telegram/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...user,
          invite_token: inviteToken || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { detail?: string }).detail || "Не удалось подтвердить авторизацию",
        );
      }

      const data = await response.json();
      const displayName =
        data.user?.display_name ||
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.username ||
        "Студент";
      setUserName(displayName);
      setState("confirmed");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Ошибка при авторизации через Telegram",
      );
      setState("error");
    }
  }

  async function handleDevLogin(): Promise<void> {
    try {
      const authDate = Math.floor(Date.now() / 1000);
      const data: Record<string, string | number> = {
        auth_date: authDate,
        first_name: "Иван",
        id: 156587029,
        last_name: "Климов",
        username: "ivanklimov",
      };
      const checkString = Object.keys(data)
        .sort()
        .map((k) => `${k}=${data[k]}`)
        .join("\n");

      const enc = new TextEncoder();
      const secretKeyHash = await crypto.subtle.digest(
        "SHA-256",
        enc.encode("mock-bot-token"),
      );
      const key = await crypto.subtle.importKey(
        "raw",
        secretKeyHash,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode(checkString));
      const hash = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await handleTelegramAuth({
        id: Number(data.id),
        first_name: String(data.first_name),
        last_name: String(data.last_name),
        username: String(data.username),
        auth_date: Number(data.auth_date),
        hash,
      });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Ошибка тестовой авторизации",
      );
      setState("error");
    }
  }

  return (
    <main className="login-page">
      <div className="login-brand">
        <span className="brand-mark" aria-hidden="true">
          <Send size={20} />
        </span>
        <span>Zeta</span>
      </div>

      <section className="login-surface" aria-live="polite">
        {inviteToken ? (
          <div className="invite-badge" role="status">
            <KeyRound size={14} />
            <span>Вход по приглашению в группу</span>
          </div>
        ) : null}

        {state === "authenticating" ? (
          <div className="authenticating-status">
            <LoaderCircle className="spin" size={32} />
            <h2>Авторизация...</h2>
            <p className="login-copy">Проверяем данные Telegram и настраиваем профиль.</p>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="login-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{errorMessage || "Ошибка авторизации"}</span>
            <button
              className="text-button"
              type="button"
              onClick={() => setState("idle")}
            >
              Попробовать снова
            </button>
          </div>
        ) : null}

        {state === "idle" || state === "error" ? (
          <>
            <div className="login-icon">
              <Send size={28} />
            </div>
            <p className="eyebrow">Закрытое пространство ФКН</p>
            <h1>Всё важное к следующей паре</h1>
            <p className="login-copy">
              Войдите через Telegram, чтобы увидеть расписание своей группы и актуальные задания.
            </p>

            <div className="telegram-widget-area">
              <TelegramLoginButton
                botUsername={BOT_USERNAME}
                onAuth={handleTelegramAuth}
                size="large"
              />
            </div>

            <button
              type="button"
              className="button button-secondary dev-login-btn"
              onClick={handleDevLogin}
            >
              <Code2 size={16} />
              <span>Войти в тестовом режиме (Dev Login)</span>
            </button>

            <div className="privacy-note">
              <ShieldCheck size={17} />
              <span>Пароль не нужен. Мы получим только ваш публичный Telegram ID.</span>
            </div>
          </>
        ) : null}

        {state === "confirmed" ? (
          <>
            <div className="login-icon success">
              <Check size={30} />
            </div>
            <p className="eyebrow">Готово</p>
            <h1>Вы вошли</h1>
            <p className="login-copy">
              {userName
                ? `Профиль ${userName} подтверждён. Можно переходить к расписанию.`
                : "Профиль найден. Можно переходить к расписанию."}
            </p>
            <Link className="button button-primary login-button" href="/">
              Открыть расписание
              <ArrowRight size={18} />
            </Link>
          </>
        ) : null}
      </section>

      <p className="login-footer">
        Для входа нужна действующая ссылка-приглашение или аккаунт старосты
      </p>
    </main>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="login-page" />}>
      <LoginForm />
    </Suspense>
  );
}
