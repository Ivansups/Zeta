"use client";

import { Bell, ChevronRight, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { GroupSettings } from "@/components/group-settings";
import { api } from "@/lib/api";

export function ThemeSettings(): React.JSX.Element {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notifications, setNotifications] = useState(true);
  const [profile, setProfile] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.getMe().then((user) => {
      if (cancelled || !user) {
        return;
      }
      const name = user.display_name || user.username || `ID ${user.telegram_id}`;
      const details = [
        user.role === "elder" ? "староста" : user.role,
        user.subgroup_number ? `подгруппа ${user.subgroup_number}` : "",
      ].filter(Boolean);
      setProfile(`${name}${details.length ? ` · ${details.join(" · ")}` : ""}`);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <div className="settings-group">
          <button className="settings-row" type="button">
            <span className="settings-icon"><UserRound size={18} strokeWidth={1.75} /></span>
            <span>
              <strong>{profile ? profile.split(" · ")[0] : "Профиль"}</strong>
              <small>{profile ? profile.split(" · ").slice(1).join(" · ") : "Войдите через Telegram"}</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Учебная группа</h2>
        <GroupSettings />
      </section>

      <section className="settings-section">
        <h2>Оформление</h2>
        <div className="settings-group">
          <div className="settings-row static-row">
            <span className="settings-icon">{theme === "light" ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}</span>
            <span><strong>Тема</strong><small>Выберите комфортный режим</small></span>
            <div className="segmented-control theme-control" role="group" aria-label="Тема оформления">
              <button className={theme === "light" ? "is-active" : ""} type="button" onClick={() => changeTheme("light")} aria-label="Светлая тема"><Sun size={15} /></button>
              <button className={theme === "dark" ? "is-active" : ""} type="button" onClick={() => changeTheme("dark")} aria-label="Тёмная тема"><Moon size={15} /></button>
            </div>
          </div>
          <div className="settings-row static-row">
            <span className="settings-icon"><Bell size={18} strokeWidth={1.75} /></span>
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
        </div>
      </section>

      <button className="settings-row danger-row" type="button">
        <span className="settings-icon"><LogOut size={18} strokeWidth={1.75} /></span>
        <span><strong>Выйти из аккаунта</strong><small>Потребуется повторный вход через Telegram</small></span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
