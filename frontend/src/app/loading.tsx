export default function Loading(): React.JSX.Element {
  return (
    <main className="app-loading" aria-busy="true" aria-live="polite">
      <div><span className="spin">◌</span><p>Загружаем расписание</p></div>
    </main>
  );
}
