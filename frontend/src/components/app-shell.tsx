import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  active: "schedule" | "homework" | "admin" | "settings";
  children: ReactNode;
};

const navigation = [
  { id: "schedule", href: "/", label: "Расписание", icon: CalendarDays },
  { id: "homework", href: "/homework", label: "Задания", icon: BookOpen },
  { id: "admin", href: "/admin", label: "Управление", icon: ShieldCheck },
  { id: "settings", href: "/settings", label: "Настройки", icon: Settings },
] as const;

export function AppShell({ active, children }: AppShellProps): React.JSX.Element {
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
        <div className="profile-row">
          <span className="avatar avatar-blue">ДШ</span>
          <div>
            <strong>Данил Шелудько</strong>
            <span>Староста · ПИ-221</span>
          </div>
        </div>
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
      </nav>
    </div>
  );
}
