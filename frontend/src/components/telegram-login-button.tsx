"use client";

import { useEffect, useRef } from "react";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface TelegramLoginButtonProps {
  botUsername?: string;
  onAuth: (user: TelegramUser) => void;
  size?: "small" | "medium" | "large";
  cornerRadius?: number;
  requestAccess?: "read" | "write";
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

export function TelegramLoginButton({
  botUsername,
  onAuth,
  size = "large",
  cornerRadius = 8,
  requestAccess = "write",
}: TelegramLoginButtonProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const isConfigured = Boolean(
    botUsername &&
      botUsername.trim() !== "" &&
      botUsername !== "zeta_auth_bot",
  );

  useEffect(() => {
    window.onTelegramAuth = (user: TelegramUser) => {
      onAuth(user);
    };

    const container = containerRef.current;
    if (!container || !isConfigured || !botUsername) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", size);
    script.setAttribute("data-radius", cornerRadius.toString());
    script.setAttribute("data-request-access", requestAccess);
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");

    container.innerHTML = "";
    container.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [botUsername, isConfigured, onAuth, size, cornerRadius, requestAccess]);

  if (!isConfigured) {
    return (
      <div
        className="telegram-widget-unconfigured"
        data-testid="telegram-widget-container"
      >
        <span className="unconfigured-label">Telegram Login Widget</span>
        <small>
          Укажите имя бота в <code>NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>
        </small>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="telegram-widget-box"
      data-testid="telegram-widget-container"
    />
  );
}
