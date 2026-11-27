import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api } from "@/lib/api";
import { addDays } from "@/lib/week";
import { apiHomework, apiPair, apiUser } from "@/lib/test-fixtures";

import { HomeworkBoard } from "./homework-board";

jest.mock("@/lib/api", () => ({
  api: {
    getMe: jest.fn(),
    getHomeworks: jest.fn(),
    getWeekSchedule: jest.fn(),
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

function deadlineInDays(days: number): string {
  const date = addDays(new Date(), days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}T12:00:00Z`;
}

beforeEach(() => {
  mockedApi.getMe.mockResolvedValue(apiUser({ id: "me", role: "elder" }));
  mockedApi.getHomeworks.mockResolvedValue([
    apiHomework({
      id: "hw-today",
      description: "Исследовать ряды на сходимость",
      subgroup: 1,
      schedule_pair_id: "pair-math",
      deadline: deadlineInDays(0),
    }),
    apiHomework({
      id: "hw-later",
      description: "Подготовить доклад по истории",
      schedule_pair_id: "pair-history",
      deadline: deadlineInDays(10),
    }),
    apiHomework({
      id: "hw-overdue",
      description: "Сдать лабораторную по Python",
      subject: "Программирование на Python",
      schedule_pair_id: null,
      deadline: deadlineInDays(-2),
    }),
  ]);
  mockedApi.getWeekSchedule.mockResolvedValue([
    apiPair({
      id: "pair-math",
      subject: "Математический анализ",
      lesson_type: "лек",
      room: "101",
      start_time: "09:00:00",
    }),
    apiPair({
      id: "pair-history",
      subject: "История России",
      lesson_type: "прак",
      room: null,
      is_online: true,
    }),
  ]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("HomeworkBoard", () => {
  it("groups homeworks into overdue, today, tomorrow and later columns", async () => {
    render(<HomeworkBoard />);

    expect(await screen.findByText("Исследовать ряды на сходимость")).toBeInTheDocument();
    const later = screen.getByRole("region", { name: "Позже" });
    expect(
      within(later).getByText("Подготовить доклад по истории"),
    ).toBeInTheDocument();
    const overdue = screen.getByRole("region", { name: "Просрочено" });
    expect(
      within(overdue).getByText("Сдать лабораторную по Python"),
    ).toBeInTheDocument();
  });

  it("uses the real lesson type and room of the schedule pair", async () => {
    render(<HomeworkBoard />);

    const mathCard = (await screen.findByText("Исследовать ряды на сходимость")).closest(
      "article",
    )!;
    expect(within(mathCard).getByText("Лекция")).toBeInTheDocument();
    expect(within(mathCard).getByText("ауд. 101")).toBeInTheDocument();

    const historyCard = screen
      .getByText("Подготовить доклад по истории")
      .closest("article")!;
    expect(within(historyCard).getByText("Практика")).toBeInTheDocument();
    expect(within(historyCard).getByText("Онлайн")).toBeInTheDocument();
  });

  it("links to the schedule pair, not to the homework id", async () => {
    render(<HomeworkBoard />);

    const mathCard = (await screen.findByText("Исследовать ряды на сходимость")).closest(
      "article",
    )!;
    expect(within(mathCard).getByRole("link", { name: /К паре/ })).toHaveAttribute(
      "href",
      "/?lesson=pair-math",
    );

    const overdueCard = screen
      .getByText("Сдать лабораторную по Python")
      .closest("article")!;
    expect(within(overdueCard).queryByRole("link", { name: /К паре/ })).toBeNull();
  });

  it("filters by subgroup and keeps group-wide homework visible", async () => {
    const user = userEvent.setup();
    render(<HomeworkBoard />);

    await screen.findByText("Исследовать ряды на сходимость");
    await user.click(screen.getByRole("button", { name: "Подгруппа 2" }));

    expect(
      screen.queryByText("Исследовать ряды на сходимость"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Сдать лабораторную по Python")).toBeInTheDocument();
    expect(
      screen.getByText("Подготовить доклад по истории"),
    ).toBeInTheDocument();
  });

  it("switches to calendar mode by weekdays and displays 7 days", async () => {
    const user = userEvent.setup();
    render(<HomeworkBoard />);

    await screen.findByText("Исследовать ряды на сходимость");
    await user.click(screen.getByRole("button", { name: "По дням недели" }));

    expect(screen.getByText("Задания на неделю")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Навигация по неделям" })).toBeInTheDocument();

    // Check weekday columns presence
    expect(screen.getByText("Понедельник")).toBeInTheDocument();
    expect(screen.getByText("Вторник")).toBeInTheDocument();
    expect(screen.getByText("Среда")).toBeInTheDocument();
    expect(screen.getByText("Четверг")).toBeInTheDocument();
    expect(screen.getByText("Пятница")).toBeInTheDocument();
    expect(screen.getByText("Суббота")).toBeInTheDocument();
    expect(screen.getByText("Воскресенье")).toBeInTheDocument();

    // Today's homework is visible in calendar mode
    expect(screen.getByText("Исследовать ряды на сходимость")).toBeInTheDocument();
  });

  it("supports week navigation in calendar mode", async () => {
    const user = userEvent.setup();
    render(<HomeworkBoard />);

    await screen.findByText("Исследовать ряды на сходимость");
    await user.click(screen.getByRole("button", { name: "По дням недели" }));

    expect(screen.getByText("Текущая неделя")).toBeInTheDocument();

    // Navigate to next week
    await user.click(screen.getByRole("button", { name: "Следующая неделя" }));
    expect(screen.getByRole("button", { name: "Вернуться к текущей" })).toBeInTheDocument();

    // Return back to current week
    await user.click(screen.getByRole("button", { name: "Вернуться к текущей" }));
    expect(screen.getByText("Текущая неделя")).toBeInTheDocument();
  });

  it("shows onboarding instead of an empty board when the user has no group", async () => {
    mockedApi.getMe.mockResolvedValue(
      apiUser({ id: "new-user", group_id: null, group_name: null }),
    );

    render(<HomeworkBoard />);

    expect(
      await screen.findByRole("heading", { name: "Настройте учебную группу" }),
    ).toBeInTheDocument();
    expect(mockedApi.getHomeworks).not.toHaveBeenCalled();
  });
});
