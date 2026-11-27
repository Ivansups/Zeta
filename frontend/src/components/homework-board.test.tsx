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
    toggleHomeworkCompletion: jest.fn(),
    suggestHomework: jest.fn(),
    recallHomework: jest.fn(),
    moderateHomework: jest.fn(),
    updateParticipantStatus: jest.fn(),
  },
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
      created_by_id: "me",
      is_completed: false,
    }),
    apiHomework({
      id: "hw-later",
      description: "Подготовить доклад по истории",
      schedule_pair_id: "pair-history",
      deadline: deadlineInDays(10),
      created_by_id: "user-2",
    }),
    apiHomework({
      id: "hw-overdue",
      description: "Сдать лабораторную по Python",
      subject: "Программирование на Python",
      schedule_pair_id: null,
      deadline: deadlineInDays(-2),
      created_by_id: "user-3",
    }),
    apiHomework({
      id: "hw-backlog",
      description: "Прочитать дополнительную литературу",
      subject: "Базы данных",
      schedule_pair_id: null,
      deadline: null,
      created_by_id: "me",
      is_personal: true,
      status: "approved",
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
  mockedApi.toggleHomeworkCompletion.mockResolvedValue({
    homework_id: "hw-today",
    is_completed: true,
  });
  mockedApi.suggestHomework.mockImplementation(async (id) =>
    apiHomework({
      id,
      description: "Прочитать дополнительную литературу",
      is_personal: true,
      status: "pending_approval",
      created_by_id: "me",
    }),
  );
  mockedApi.recallHomework.mockImplementation(async (id) =>
    apiHomework({
      id,
      description: "Прочитать дополнительную литературу",
      is_personal: true,
      status: "recalled",
      created_by_id: "me",
    }),
  );
  mockedApi.moderateHomework.mockImplementation(async (id, data) =>
    apiHomework({
      id,
      title: data.title ?? "Одобренное ДЗ",
      description: data.description ?? "Описание",
      is_personal: false,
      status: "approved",
    }),
  );
  mockedApi.updateParticipantStatus.mockImplementation(async (_hwId, userId, isSubmitted) => ({
    id: "part-1",
    homework_id: "hw-with-parts",
    user_id: userId,
    is_submitted: isSubmitted,
    submitted_at: isSubmitted ? new Date().toISOString() : null,
  }));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("HomeworkBoard", () => {
  it("groups homeworks into overdue, today, tomorrow, later and backlog columns", async () => {
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
    const backlog = screen.getByRole("region", { name: "Без срока" });
    expect(
      within(backlog).getByText("Прочитать дополнительную литературу"),
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

    expect(screen.getByText("Понедельник")).toBeInTheDocument();
    expect(screen.getByText("Вторник")).toBeInTheDocument();
    expect(screen.getByText("Среда")).toBeInTheDocument();
    expect(screen.getByText("Четверг")).toBeInTheDocument();
    expect(screen.getByText("Пятница")).toBeInTheDocument();
    expect(screen.getByText("Суббота")).toBeInTheDocument();
    expect(screen.getByText("Воскресенье")).toBeInTheDocument();

    expect(screen.getByText("Исследовать ряды на сходимость")).toBeInTheDocument();
  });

  it("supports week navigation in calendar mode", async () => {
    const user = userEvent.setup();
    render(<HomeworkBoard />);

    await screen.findByText("Исследовать ряды на сходимость");
    await user.click(screen.getByRole("button", { name: "По дням недели" }));

    expect(screen.getByText("Текущая неделя")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Следующая неделя" }));
    expect(screen.getByRole("button", { name: "Вернуться к текущей" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Вернуться к текущей" }));
    expect(screen.getByText("Текущая неделя")).toBeInTheDocument();
  });

  it("toggles personal completion status when clicking the complete button", async () => {
    const user = userEvent.setup();
    render(<HomeworkBoard />);

    const todaySection = await screen.findByRole("region", { name: "Сегодня" });
    const completeBtn = within(todaySection).getByRole("button", {
      name: "Отметить выполненным",
    });
    await user.click(completeBtn);

    expect(mockedApi.toggleHomeworkCompletion).toHaveBeenCalledWith("hw-today");
    expect(
      within(todaySection).getByRole("button", { name: "Отметить невыполненным" }),
    ).toBeInTheDocument();
  });

  it("allows author to suggest a personal task to the group", async () => {
    const user = userEvent.setup();
    render(<HomeworkBoard />);

    await screen.findByText("Прочитать дополнительную литературу");
    const suggestBtn = screen.getByRole("button", { name: "Предложить в группу" });
    await user.click(suggestBtn);

    expect(mockedApi.suggestHomework).toHaveBeenCalledWith("hw-backlog");
    expect(await screen.findByText("На модерации")).toBeInTheDocument();
  });

  it("allows elder to open moderation modal and approve pending task", async () => {
    mockedApi.getHomeworks.mockResolvedValue([
      apiHomework({
        id: "hw-pending",
        title: "Конспект лекции",
        description: "Конспект 5 главы",
        subject: "Физика",
        status: "pending_approval",
        is_personal: true,
        created_by_id: "other-user",
        deadline: deadlineInDays(3),
      }),
    ]);

    const user = userEvent.setup();
    render(<HomeworkBoard />);

    await screen.findByText("Конспект 5 главы");
    expect(screen.getByText("На модерации")).toBeInTheDocument();

    const moderateBtn = screen.getByRole("button", { name: "Модерация" });
    await user.click(moderateBtn);

    expect(await screen.findByRole("heading", { name: "Предложение задания в группу" })).toBeInTheDocument();

    const approveBtn = screen.getByRole("button", { name: /Одобрить и опубликовать/i });
    await user.click(approveBtn);

    expect(mockedApi.moderateHomework).toHaveBeenCalledWith("hw-pending", expect.objectContaining({
      action: "approve",
    }));
  });

  it("displays participants and allows elder to toggle submission status", async () => {
    mockedApi.getHomeworks.mockResolvedValue([
      apiHomework({
        id: "hw-participants",
        title: "Лабораторная работа",
        description: "Сдать отчет по лабе",
        deadline: deadlineInDays(1),
        participants: [
          {
            user_id: "student-1",
            is_submitted: false,
            submitted_at: null,
          },
        ],
      }),
    ]);

    const user = userEvent.setup();
    render(<HomeworkBoard />);

    await screen.findByText("Сдать отчет по лабе");
    expect(screen.getByText("Участники задания:")).toBeInTheDocument();

    const partBtn = screen.getByRole("button", { name: /Студент stud/i });
    expect(partBtn).toBeInTheDocument();
    await user.click(partBtn);

    expect(mockedApi.updateParticipantStatus).toHaveBeenCalledWith(
      "hw-participants",
      "student-1",
      true,
    );
  });
});
