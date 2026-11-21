import { AdminPanel } from "@/components/admin-panel";
import { AppShell } from "@/components/app-shell";

export default function AdminPage(): React.JSX.Element {
  return (
    <AppShell active="admin">
      <div className="page-wrap">
        <header className="page-header">
          <div>
            <p className="eyebrow">Группа и роли</p>
            <h1>Управление группой</h1>
            <p className="page-subtitle">
              Приглашения в подгруппы и роли участников
            </p>
          </div>
        </header>

        <AdminPanel />
      </div>
    </AppShell>
  );
}
