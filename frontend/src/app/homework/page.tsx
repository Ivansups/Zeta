import { AppShell } from "@/components/app-shell";
import { HomeworkBoard } from "@/components/homework-board";

export default function HomeworkPage(): React.JSX.Element {
  return (
    <AppShell active="homework">
      <div className="page-wrap">
        <header className="page-header">
          <div>
            <p className="eyebrow">ПИ-221 · 7 учебная неделя</p>
            <h1>Домашние задания</h1>
            <p className="page-subtitle">Держите учебные задачи в поле зрения</p>
          </div>
          <span className="quiet-badge">Четверг, 15 октября</span>
        </header>
        <HomeworkBoard />
      </div>
    </AppShell>
  );
}
