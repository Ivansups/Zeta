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
import type { ReactNode } from "react";

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

const defaultUser: ShellUser = {
  name: "Данил Шелудько",
  role: "Староста",
  group: "ПИ-221",
  initials: "ДШ",
};

const navigation = [
  { id: "schedule", href: "/", label: "Расписание", icon: CalendarDays },
  { id: "homework", href: "/homework", label: "Задания", icon: BookOpen },
  { id: "admin", href: "/admin", label: "Управление", icon: ShieldCheck },
  { id: "settings", href: "/settings", label: "Настройки", icon: Settings },
] as const;

export function AppShell({ active, children, user = defaultUser }: AppShellProps): React.JSX.Element {
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
            <strong>Осенний семестр</strong>
            <span>7 учебная неделя</span>
          </div>
        </div>

        {user ? (
          <div className="profile-row">
            <span className="avatar avatar-blue">{user.initials || user.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{user.role} · {user.group}</span>
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
        {!user ? (
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
