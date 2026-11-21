import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api } from "@/lib/api";
import { apiPair, apiUser } from "@/lib/test-fixtures";

import Home from "./page";

jest.mock("@/lib/api", () => ({
  api: {
    getMe: jest.fn(),
    getDaySchedule: jest.fn(),
    getWeekSchedule: jest.fn(),
    getHomeworks: jest.fn(),
    createHomework: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe("Home", () => {
  beforeEach(() => {
    mockedApi.getMe.mockResolvedValue(
      apiUser({ id: "me", role: "elder", display_name: "Данил Шелудько" }),
    );
    mockedApi.getDaySchedule.mockResolvedValue([
      apiPair({ id: "pair-math", pair_number: 1, subject: "Математический анализ" }),
      apiPair({
        id: "pair-algorithms",
        pair_number: 2,
        subject: "Алгоритмы и структуры данных",
        subgroup: 2,
      }),
    ]);
    mockedApi.getWeekSchedule.mockResolvedValue([]);
    mockedApi.getHomeworks.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows the schedule and switches subgroups", async () => {
    const user = userEvent.setup();

    render(<Home />);

    expect(
      await screen.findByRole("heading", { name: "Расписание" }),
    ).toBeInTheDocument();
    expect(
      (await screen.findAllByText("Математический анализ")).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Алгоритмы и структуры данных")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Подгруппа 2" }));

    expect(
      (await screen.findAllByText("Алгоритмы и структуры данных")).length,
    ).toBeGreaterThan(0);
  });

  it("shows the Telegram login prompt for an anonymous visitor", async () => {
    mockedApi.getMe.mockResolvedValue(null);

    render(<Home />);

    expect(
      (await screen.findAllByRole("link", { name: /Войти через Telegram/i })).length,
    ).toBeGreaterThan(0);
  });
});
