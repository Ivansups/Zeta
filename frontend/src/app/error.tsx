"use client";

import { useEffect } from "react";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: RootErrorProps): React.JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="error-state">
      <div>
        <h2>Не удалось загрузить страницу</h2>
        <p>Проверьте соединение и попробуйте повторить запрос.</p>
        <button className="button button-primary" type="button" onClick={reset}>Повторить</button>
      </div>
    </main>
  );
}
