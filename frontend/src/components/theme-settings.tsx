"use client";

import { Bell, ChevronRight, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useState } from "react";

export function ThemeSettings(): React.JSX.Element {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notifications, setNotifications] = useState(true);

  function changeTheme(nextTheme: "light" | "dark"): void {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <div className="page-wrap narrow-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Личное пространство</p>
          <h1>Настройки</h1>
          <p className="page-subtitle">Профиль, оформление и уведомления</p>
        </div>
      </header>

      <section className="settings-section">
        <h2>Профиль</h2>
        <button className="settings-row" type="button">
          <span className="settings-icon"><UserRound size={19} /></span>
          <span><strong>Данил Шелудько</strong><small>ПИ-221 · подгруппа 1 · староста</small></span>
          <ChevronRight size={18} />
        </button>
      </section>

      <section className="settings-section">
        <h2>Оформление</h2>
        <div className="settings-row static-row">
          <span className="settings-icon">{theme === "light" ? <Sun size={19} /> : <Moon size={19} />}</span>
          <span><strong>Тема</strong><small>Выберите комфортный режим</small></span>
          <div className="segmented-control theme-control" role="group" aria-label="Тема оформления">
            <button className={theme === "light" ? "is-active" : ""} type="button" onClick={() => changeTheme("light")} aria-label="Светлая тема"><Sun size={16} /></button>
            <button className={theme === "dark" ? "is-active" : ""} type="button" onClick={() => changeTheme("dark")} aria-label="Тёмная тема"><Moon size={16} /></button>
          </div>
        </div>
        <div className="settings-row static-row">
          <span className="settings-icon"><Bell size={19} /></span>
          <span><strong>Уведомления</strong><small>Напоминать о новых заданиях</small></span>
          <button
            className={`toggle${notifications ? " is-active" : ""}`}
            type="button"
            role="switch"
            aria-checked={notifications}
            aria-label="Уведомления"
            onClick={() => setNotifications((value) => !value)}
          ><span /></button>
        </div>
      </section>

      <button className="settings-row danger-row" type="button">
        <span className="settings-icon"><LogOut size={19} /></span>
        <span><strong>Выйти из аккаунта</strong><small>Потребуется повторный вход через Telegram</small></span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
