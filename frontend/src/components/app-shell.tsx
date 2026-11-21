"use client";

import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { api, type ApiUser } from "@/lib/api";
import { currentSemesterLabel, currentStudyWeek } from "@/lib/week";

export type ShellUser = {
  name: string;
  role: string;
  group: string;
  initials?: string;
};

type AppShellProps = {
  active: "schedule" | "homework" | "admin" | "settings";
  children: ReactNode;
  user?: ShellUser | null;
};

const navigation = [
  { id: "schedule", href: "/", label: "Расписание", icon: CalendarDays },
  { id: "homework", href: "/homework", label: "Задания", icon: BookOpen },
  { id: "admin", href: "/admin", label: "Управление", icon: ShieldCheck },
  { id: "settings", href: "/settings", label: "Настройки", icon: Settings },
] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: "Админ",
  elder: "Староста",
  helper: "Помощник",
  curator: "Куратор",
  student: "Студент",
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function toShellUser(user: ApiUser): ShellUser {
  const name = user.display_name || user.username || "Пользователь";
  const group = [
    user.group_name,
    user.subgroup_number ? `Подгруппа ${user.subgroup_number}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    name,
    role: ROLE_LABELS[user.role] ?? user.role,
    group,
    initials: initialsOf(name),
  };
}

export function AppShell({ active, children, user }: AppShellProps): React.JSX.Element {
  const [currentUser, setCurrentUser] = useState<ShellUser | null | undefined>(user);
  const semester = currentSemesterLabel(new Date());
  const week = currentStudyWeek(new Date());

  useEffect(() => {
    if (user !== undefined) {
      return;
    }
    let cancelled = false;
    void api.getMe().then((remote) => {
      if (!cancelled) {
        setCurrentUser(remote ? toShellUser(remote) : null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayedUser = user !== undefined ? user : currentUser ?? null;

  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="Основная навигация">
        <Link className="brand" href="/" aria-label="Zeta — главная">
          <span className="brand-mark" aria-hidden="true">
            <GraduationCap size={21} strokeWidth={2.2} />
          </span>
          <span>Zeta</span>
        </Link>

        <nav className="sidebar-nav">
          <p className="nav-label">Пространство</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === active;
            return (
              <Link
                key={item.id}
                className={`nav-item${isActive ? " is-active" : ""}`}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={19} strokeWidth={1.9} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="semester-card">
          <LayoutDashboard size={18} aria-hidden="true" />
          <div>
            <strong>{semester}</strong>
            <span>{week} учебная неделя</span>
          </div>
        </div>

        {displayedUser ? (
          <div className="profile-row">
            <span className="avatar avatar-blue">
              {displayedUser.initials || displayedUser.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{displayedUser.name}</strong>
              <span>
                {[displayedUser.role, displayedUser.group].filter(Boolean).join(" · ")}
              </span>
            </div>
          </div>
        ) : (
          <div className="sidebar-login-prompt">
            <Link className="sidebar-login-btn" href="/login">
              <LogIn size={18} strokeWidth={2} />
              <span>Войти через Telegram</span>
            </Link>
          </div>
        )}
      </aside>

      <main className="app-content">{children}</main>

      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              className={isActive ? "is-active" : ""}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={21} strokeWidth={1.9} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {!displayedUser ? (
          <Link
            className="mobile-login-link"
            href="/login"
            aria-label="Войти через Telegram"
          >
            <LogIn size={21} strokeWidth={1.9} />
            <span>Вход</span>
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
