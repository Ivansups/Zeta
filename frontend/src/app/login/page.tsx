"use client";

import { ArrowRight, Check, LoaderCircle, Send, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type LoginState = "idle" | "pending" | "confirmed";

const telegramLink = "https://t.me/zeta_bot?start=login_demo_token";

export default function LoginPage(): React.JSX.Element {
  const [state, setState] = useState<LoginState>("idle");
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    if (state !== "pending") {
      return;
    }

    const timeout = window.setTimeout(() => setState("confirmed"), 8000);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function startLogin(): Promise<void> {
    setState("pending");
    try {
      const QRCode = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(telegramLink, {
        margin: 1,
        width: 216,
        color: { dark: "#17181c", light: "#ffffff" },
      });
      setQrCode(dataUrl);
    } catch {
      setQrCode("");
    }
  }

  return (
    <main className="login-page">
      <div className="login-brand">
        <span className="brand-mark" aria-hidden="true"><Send size={20} /></span>
        <span>Zeta</span>
      </div>

      <section className="login-surface" aria-live="polite">
        {state === "idle" ? (
          <>
            <div className="login-icon"><Send size={28} /></div>
            <p className="eyebrow">Закрытое пространство ФКН</p>
            <h1>Всё важное к следующей паре</h1>
            <p className="login-copy">
              Войдите через Telegram, чтобы увидеть расписание своей группы и актуальные задания.
            </p>
            <button className="button button-primary login-button" type="button" onClick={startLogin}>
              <Send size={18} />
              Войти через Telegram
              <ArrowRight size={18} />
            </button>
            <div className="privacy-note">
              <ShieldCheck size={17} />
              <span>Пароль не нужен. Мы получим только ваш Telegram ID.</span>
            </div>
          </>
        ) : null}

        {state === "pending" ? (
          <>
            <p className="eyebrow">Шаг 1 из 1</p>
            <h1>Подтвердите вход</h1>
            <p className="login-copy">Откройте ссылку или наведите камеру телефона на QR-код.</p>
            <div className="qr-frame">
              {qrCode ? (
                <Image
                  src={qrCode}
                  alt="QR-код для входа через Telegram"
                  width={216}
                  height={216}
                  unoptimized
                />
              ) : <div className="qr-placeholder" />}
            </div>
            <a className="button button-primary login-button" href={telegramLink} target="_blank" rel="noreferrer">
              <Send size={18} />
              Открыть Telegram
              <ArrowRight size={18} />
            </a>
            <div className="pending-status"><LoaderCircle className="spin" size={17} /><span>Ожидаем подтверждение</span></div>
            <button className="text-button" type="button" onClick={() => setState("idle")}>Начать заново</button>
          </>
        ) : null}

        {state === "confirmed" ? (
          <>
            <div className="login-icon success"><Check size={30} /></div>
            <p className="eyebrow">Готово</p>
            <h1>Вы вошли</h1>
            <p className="login-copy">Профиль ПИ-221 найден. Можно переходить к расписанию.</p>
            <Link className="button button-primary login-button" href="/">
              Открыть расписание
              <ArrowRight size={18} />
            </Link>
          </>
        ) : null}
      </section>

      <p className="login-footer">Для входа нужна действующая ссылка-приглашение</p>
    </main>
  );
}
