import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api } from "@/lib/api";
import { addDays } from "@/lib/week";
import { apiHomework, apiUser } from "@/lib/test-fixtures";

import HomeworkPage from "./page";

jest.mock("@/lib/api", () => ({
  api: {
    getMe: jest.fn(),
    getHomeworks: jest.fn(),
    getWeekSchedule: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

function deadline(offsetDays: number): string {
  const date = addDays(new Date(), offsetDays);
  date.setUTCHours(23, 59, 0, 0);
  return date.toISOString();
}

describe("HomeworkPage", () => {
  beforeEach(() => {
    mockedApi.getMe.mockResolvedValue(apiUser({ id: "me", role: "student" }));
    mockedApi.getWeekSchedule.mockResolvedValue([]);
    mockedApi.getHomeworks.mockResolvedValue([
      apiHomework({
        id: "hw-today",
        description: "Исследовать ряды на сходимость",
        subgroup: 1,
        deadline: deadline(0),
      }),
      apiHomework({
        id: "hw-tomorrow",
        description: "Реализовать красно-чёрное дерево",
        subgroup: 2,
        deadline: deadline(1),
      }),
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the homework kanban with the active navigation item", async () => {
    render(<HomeworkPage />);

    expect(
      screen.getByRole("heading", { name: "Домашние задания" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Задания" })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
    expect(
      await screen.findByText("Исследовать ряды на сходимость"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Реализовать красно-чёрное дерево"),
    ).not.toBeInTheDocument();
  });

  it("filters cards by subgroup without introducing homework statuses", async () => {
    const user = userEvent.setup();

    render(<HomeworkPage />);

    await screen.findByText("Исследовать ряды на сходимость");

    await user.click(screen.getByRole("button", { name: "Подгруппа 2" }));

    expect(
      screen.queryByText("Исследовать ряды на сходимость"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Реализовать красно-чёрное дерево")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Сегодня" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Завтра" })).toBeInTheDocument();
    expect(screen.queryByText("В работе")).not.toBeInTheDocument();
    expect(screen.queryByText("Готово")).not.toBeInTheDocument();
  });
});
