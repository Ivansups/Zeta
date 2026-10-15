import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LoginPage from "./page";

describe("LoginPage", () => {
  it("starts Telegram authorization and shows the pending state", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);
    await user.click(screen.getByRole("button", { name: "Войти через Telegram" }));

    expect(screen.getByRole("heading", { name: "Подтвердите вход" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть Telegram" })).toHaveAttribute(
      "href",
      expect.stringContaining("t.me"),
    );
    expect(screen.getByText("Ожидаем подтверждение")).toBeInTheDocument();
  });
});
