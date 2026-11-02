import { act, render, screen } from "@testing-library/react";

import LoginPage from "./page";

describe("LoginPage", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    delete window.onTelegramAuth;
    window.history.replaceState({}, "", "/login");
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("renders Telegram widget container and brand headers", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("telegram-widget-container")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Всё важное к следующей паре" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Пароль не нужен. Мы получим только ваш публичный Telegram ID."),
    ).toBeInTheDocument();
  });

  it("displays invite banner when invite token is present in search params", () => {
    window.history.replaceState({}, "", "/login?invite=group_invite_xyz");
    render(<LoginPage />);
    expect(screen.getByText("Вход по приглашению в группу")).toBeInTheDocument();
  });

  it("handles successful Telegram widget authentication", async () => {
    const mockUserResponse = {
      user: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        telegram_id: 99999,
        role: "student",
        display_name: "Иван Тестов",
      },
      access_token: "mock_jwt_token",
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserResponse,
    } as Response);

    render(<LoginPage />);

    expect(window.onTelegramAuth).toBeDefined();

    await act(async () => {
      window.onTelegramAuth?.({
        id: 99999,
        first_name: "Иван",
        last_name: "Тестов",
        username: "testov",
        auth_date: Math.floor(Date.now() / 1000),
        hash: "mock_hash_value",
      });
    });

    expect(screen.getByRole("heading", { name: "Вы вошли" })).toBeInTheDocument();
    expect(
      screen.getByText(/Профиль Иван Тестов подтверждён/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть расписание" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("displays error banner when authentication fails", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Подпись Telegram недействительна" }),
    } as Response);

    render(<LoginPage />);

    await act(async () => {
      window.onTelegramAuth?.({
        id: 99999,
        auth_date: Math.floor(Date.now() / 1000),
        hash: "invalid_hash",
      });
    });

    expect(
      screen.getByText("Подпись Telegram недействительна"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Попробовать снова" }),
    ).toBeInTheDocument();
  });
});
