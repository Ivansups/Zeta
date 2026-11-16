import { fireEvent, render, screen } from "@testing-library/react";

import { TelegramMiniApp } from "./telegram-mini-app";

type MockTelegramWebApp = {
  initData: string;
  ready: jest.Mock;
  expand: jest.Mock;
};

const AUTH_RESPONSE = {
  access_token: "mock_jwt_token",
  user: { display_name: "Иван Тестов" },
};

function installTelegramWebApp(
  initData = "query_id=AAH&user=%7B%7D&hash=deadbeef",
): MockTelegramWebApp {
  const webApp: MockTelegramWebApp = {
    initData,
    ready: jest.fn(),
    expand: jest.fn(),
  };
  window.Telegram = { WebApp: webApp };
  return webApp;
}

function mockFetchSuccess(): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => AUTH_RESPONSE,
  } as Response);
  global.fetch = fetchMock;
  return fetchMock;
}

describe("TelegramMiniApp", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    delete window.Telegram;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("guides the user to open the app inside Telegram", async () => {
    render(<TelegramMiniApp />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /внутри Telegram/i,
    );
    expect(
      screen.queryByRole("heading", { name: "Расписание" }),
    ).not.toBeInTheDocument();
  });

  it("authenticates automatically with Telegram initData", async () => {
    const webApp = installTelegramWebApp();
    const fetchMock = mockFetchSuccess();

    render(<TelegramMiniApp />);

    expect(await screen.findByText("Иван Тестов")).toBeInTheDocument();
    expect(webApp.ready).toHaveBeenCalledTimes(1);
    expect(webApp.expand).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/telegram/webapp",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ init_data: webApp.initData }),
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Расписание" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Математический анализ")).toBeInTheDocument();
  });

  it("switches days with the quick day buttons", async () => {
    installTelegramWebApp();
    mockFetchSuccess();

    render(<TelegramMiniApp />);

    expect(await screen.findByText("Иван Тестов")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Пятница, 16 октября" }),
    );

    expect(screen.getByText("Дискретная математика")).toBeInTheDocument();
    expect(screen.queryByText("Математический анализ")).not.toBeInTheDocument();
  });

  it("switches days with horizontal swipes", async () => {
    installTelegramWebApp();
    mockFetchSuccess();

    render(<TelegramMiniApp />);

    expect(await screen.findByText("Иван Тестов")).toBeInTheDocument();
    const panel = screen.getByTestId("tg-day-panel");

    fireEvent.touchStart(panel, { touches: [{ clientX: 220 }] });
    fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 60 }] });

    expect(screen.getByText("Дискретная математика")).toBeInTheDocument();

    fireEvent.touchStart(panel, { touches: [{ clientX: 60 }] });
    fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 220 }] });

    expect(screen.getByText("Математический анализ")).toBeInTheDocument();
  });

  it("shows the backend validation error and offers a retry", async () => {
    installTelegramWebApp();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: "Telegram Mini App validation failed: data is expired",
      }),
    } as Response);

    render(<TelegramMiniApp />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /validation failed/i,
    );
    expect(
      screen.getByRole("button", { name: "Повторить" }),
    ).toBeInTheDocument();
  });
});
