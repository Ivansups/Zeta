import { AdminPanel } from "@/components/admin-panel";
import { AppShell } from "@/components/app-shell";

export default function AdminPage(): React.JSX.Element {
  return (
    <AppShell active="admin">
      <div className="page-wrap mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="page-header mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2 text-xs font-semibold uppercase text-blue-700">
              ПИ-221 · 6 участников
            </p>
            <h1 className="text-3xl font-semibold text-zinc-950">Управление группой</h1>
            <p className="page-subtitle mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Приглашения в подгруппы и роли участников
            </p>
          </div>
          <span className="quiet-badge w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
            Группа активна
          </span>
        </header>

        <AdminPanel />
      </div>
    </AppShell>
  );
}
