import { AdminPanel } from "@/components/admin-panel";
import { AppShell } from "@/components/app-shell";

export default function AdminPage(): React.JSX.Element {
  return (
    <AppShell active="admin">
      <div className="page-wrap">
        <header className="page-header">
          <div>
            <p className="eyebrow">
              ПИ-221 · 6 участников
            </p>
            <h1>Управление группой</h1>
            <p className="page-subtitle">
              Приглашения в подгруппы и роли участников
            </p>
          </div>
          <span className="quiet-badge" style={{ color: "var(--accent-green)", background: "var(--accent-green-soft)", borderColor: "var(--accent-green-border)" }}>
            Группа активна
          </span>
        </header>

        <AdminPanel />
      </div>
    </AppShell>
  );
}
