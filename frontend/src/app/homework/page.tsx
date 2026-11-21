import { AppShell } from "@/components/app-shell";
import { HomeworkBoard } from "@/components/homework-board";
import { currentDayName, formatDayCaption } from "@/lib/week";

export default function HomeworkPage(): React.JSX.Element {
  return (
    <AppShell active="homework">
      <div className="page-wrap">
        <header className="page-header">
          <div>
            <p className="eyebrow">Дедлайны по парам</p>
            <h1>Домашние задания</h1>
            <p className="page-subtitle">Держите учебные задачи в поле зрения</p>
          </div>
          <span className="quiet-badge">
            {currentDayName(new Date())}, {formatDayCaption(new Date())}
          </span>
        </header>
        <HomeworkBoard />
      </div>
    </AppShell>
  );
}
