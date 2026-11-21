import { fireEvent, render, screen } from "@testing-library/react";

import { api } from "@/lib/api";
import { addDays, currentDayName, formatDayCaption } from "@/lib/week";

import { TelegramMiniApp } from "./telegram-mini-app";
import { apiPair } from "@/lib/test-fixtures";

jest.mock("@/lib/api", () => ({
  api: {
    getWeekSchedule: jest.fn(),
    getHomeworks: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

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

function mockAuthFetch(): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => AUTH_RESPONSE,
  } as Response);
  global.fetch = fetchMock;
  return fetchMock;
}

function dayLabel(offset: number): string {
  const date = addDays(new Date(), offset);
  return formatDayCaption(date);
}

describe("TelegramMiniApp", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockedApi.getHomeworks.mockResolvedValue([]);
    const isSunday = new Date().getDay() === 0;
    const targetOffset = isSunday ? -1 : 1;
    mockedApi.getWeekSchedule.mockResolvedValue([
      apiPair({
        id: "pair-math",
        day_of_week: currentDayName(new Date()),
        subject: "Математический анализ",
      }),
      apiPair({
        id: "pair-discrete",
        day_of_week: currentDayName(addDays(new Date(), targetOffset)),
        subject: "Дискретная математика",
        pair_number: 2,
      }),
    ]);
  });

  afterEach(() => {
    delete window.Telegram;
    global.fetch = originalFetch;
    jest.clearAllMocks();
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
    const fetchMock = mockAuthFetch();

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
    mockAuthFetch();

    render(<TelegramMiniApp />);

    expect(await screen.findByText("Иван Тестов")).toBeInTheDocument();
    const isSunday = new Date().getDay() === 0;
    const targetOffset = isSunday ? -1 : 1;
    fireEvent.click(
      screen.getByRole("button", {
        name: `${currentDayName(addDays(new Date(), targetOffset))}, ${dayLabel(targetOffset)}`,
      }),
    );

    expect(screen.getByText("Дискретная математика")).toBeInTheDocument();
    expect(screen.queryByText("Математический анализ")).not.toBeInTheDocument();
  });

  it("switches days with horizontal swipes", async () => {
    installTelegramWebApp();
    mockAuthFetch();

    render(<TelegramMiniApp />);

    expect(await screen.findByText("Иван Тестов")).toBeInTheDocument();
    const panel = screen.getByTestId("tg-day-panel");
    const isSunday = new Date().getDay() === 0;

    if (isSunday) {
      fireEvent.touchStart(panel, { touches: [{ clientX: 60 }] });
      fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 220 }] });
      expect(screen.getByText("Дискретная математика")).toBeInTheDocument();

      fireEvent.touchStart(panel, { touches: [{ clientX: 220 }] });
      fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 60 }] });
      expect(screen.getByText("Математический анализ")).toBeInTheDocument();
    } else {
      fireEvent.touchStart(panel, { touches: [{ clientX: 220 }] });
      fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 60 }] });
      expect(screen.getByText("Дискретная математика")).toBeInTheDocument();

      fireEvent.touchStart(panel, { touches: [{ clientX: 60 }] });
      fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 220 }] });
      expect(screen.getByText("Математический анализ")).toBeInTheDocument();
    }
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
