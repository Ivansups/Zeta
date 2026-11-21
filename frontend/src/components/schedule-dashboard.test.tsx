import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api } from "@/lib/api";
import { apiHomework, apiPair, apiUser } from "@/lib/test-fixtures";
import { addDays, currentDayName } from "@/lib/week";

import { ScheduleDashboard } from "./schedule-dashboard";

jest.mock("@/lib/api", () => ({
  api: {
    getMe: jest.fn(),
    getDaySchedule: jest.fn(),
    getWeekSchedule: jest.fn(),
    getHomeworks: jest.fn(),
    createHomework: jest.fn(),
    updateHomework: jest.fn(),
    deleteHomework: jest.fn(),
    parseHomework: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const today = new Date();

beforeEach(() => {
  mockedApi.getMe.mockResolvedValue(
    apiUser({
      id: "me",
      role: "elder",
      display_name: "Данил Шелудько",
      group_id: "group-1",
    }),
  );
  mockedApi.getWeekSchedule.mockResolvedValue([
    apiPair({
      id: "22222222-2222-2222-2222-222222222222",
      pair_number: 1,
      subject: "Математический анализ",
      day_of_week: currentDayName(today),
    }),
    apiPair({
      id: "11111111-1111-1111-1111-111111111111",
      pair_number: 2,
      subject: "Английский язык",
      lesson_type: "прак",
      day_of_week: currentDayName(today),
    }),
  ]);
  mockedApi.getHomeworks.mockResolvedValue([
    apiHomework({
      id: "hw-math",
      schedule_pair_id: "22222222-2222-2222-2222-222222222222",
      description: "Ряды",
    }),
  ]);
  mockedApi.createHomework.mockResolvedValue(apiHomework({ id: "hw-new" }));
  mockedApi.updateHomework.mockResolvedValue(apiHomework({ id: "hw-math" }));
  mockedApi.deleteHomework.mockResolvedValue(undefined);
  mockedApi.parseHomework.mockResolvedValue({
    subject: "Математический анализ",
    description: "Номера 12–18 к четвергу",
    deadline: "2026-10-22T12:00:00Z",
    subgroup: 1,
  });
});

afterEach(() => {
  jest.clearAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("ScheduleDashboard", () => {
  it("renders schedule from the API and shows lessons without homework", async () => {
    render(<ScheduleDashboard />);

    const englishHeading = await screen.findByRole("heading", {
      name: "Английский язык",
    });
    const englishCard = englishHeading.closest("article")!;
    expect(
      within(englishCard).getByText("Домашнего задания пока нет"),
    ).toBeInTheDocument();
  });

  it("creates homework from a lesson card and persists it through the API", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    const englishHeading = await screen.findByRole("heading", {
      name: "Английский язык",
    });
    const englishCard = englishHeading.closest("article")!;

    await user.click(
      within(englishCard).getByRole("button", { name: /\+?\s*Добавить ДЗ/i }),
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Пара")).toHaveValue("11111111-1111-1111-1111-111111111111");

    await user.type(
      screen.getByLabelText("Описание задания"),
      "Подготовить топик про технологии",
    );
    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      within(englishCard).getByText("Подготовить топик про технологии"),
    ).toBeInTheDocument();
    expect(mockedApi.createHomework).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Подготовить топик про технологии",
        subject: "Английский язык",
        schedule_pair_id: "11111111-1111-1111-1111-111111111111",
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Задание для «Английский язык» сохранено",
    );
  });

  it("updates existing homework through PATCH instead of creating a duplicate", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    const mathHeading = await screen.findByRole("heading", {
      name: "Математический анализ",
    });
    const mathCard = mathHeading.closest("article")!;
    expect(within(mathCard).getByText("Ряды")).toBeInTheDocument();

    await user.click(within(mathCard).getByRole("button", { name: /Изменить/i }));
    await user.clear(screen.getByLabelText("Описание задания"));
    await user.type(screen.getByLabelText("Описание задания"), "Ряды и интегралы");
    await user.click(screen.getByRole("button", { name: "Сохранить изменения" }));

    await waitFor(() =>
      expect(mockedApi.updateHomework).toHaveBeenCalledWith(
        "hw-math",
        expect.objectContaining({ description: "Ряды и интегралы" }),
      ),
    );
    expect(mockedApi.createHomework).not.toHaveBeenCalled();
    expect(within(mathCard).getByText("Ряды и интегралы")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Задание для «Математический анализ» обновлено",
    );
  });

  it("deletes homework after explicit confirmation", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    const mathHeading = await screen.findByRole("heading", {
      name: "Математический анализ",
    });
    const mathCard = mathHeading.closest("article")!;

    await user.click(within(mathCard).getByRole("button", { name: /Изменить/i }));
    await user.click(screen.getByRole("button", { name: "Удалить" }));
    expect(mockedApi.deleteHomework).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Удалить безвозвратно" }),
    );

    await waitFor(() => expect(mockedApi.deleteHomework).toHaveBeenCalledWith("hw-math"));
    await waitFor(() =>
      expect(
        within(mathCard).getByText("Домашнего задания пока нет"),
      ).toBeInTheDocument(),
    );
  });

  it("keeps the editor open and shows the server error when saving fails", async () => {
    const user = userEvent.setup();
    mockedApi.createHomework.mockRejectedValueOnce(
      new Error("Only elder, helper or admin may create homework"),
    );

    render(<ScheduleDashboard />);

    const englishHeading = await screen.findByRole("heading", {
      name: "Английский язык",
    });
    const englishCard = englishHeading.closest("article")!;
    await user.click(
      within(englishCard).getByRole("button", { name: /\+?\s*Добавить ДЗ/i }),
    );
    await user.type(screen.getByLabelText("Описание задания"), "Черновик");
    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));

    expect(
      await screen.findByText("Only elder, helper or admin may create homework"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(englishCard).getByText("Домашнего задания пока нет"),
    ).toBeInTheDocument();
  });

  it("parses free text through the backend assistant before saving", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    await screen.findByRole("heading", { name: "Математический анализ" });
    await user.click(screen.getByRole("button", { name: /Zeta AI/i }));
    await user.type(
      screen.getByLabelText("Текст для разбора"),
      "по матану решить номера 12–18 к четвергу",
    );
    await user.click(screen.getByRole("button", { name: /Разобрать текст/i }));

    expect(mockedApi.parseHomework).toHaveBeenCalledWith(
      "по матану решить номера 12–18 к четвергу",
    );
    expect(
      await screen.findByText("Черновик распознан Zeta AI"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Дата сдачи")).toHaveValue("2026-10-22");

    await user.click(
      screen.getByRole("button", { name: "Сохранить в расписание" }),
    );

    await waitFor(() => expect(mockedApi.createHomework).toHaveBeenCalled());
  });

  it("hides homework management controls from students", async () => {
    mockedApi.getMe.mockResolvedValue(
      apiUser({ id: "me", role: "student", subgroup_number: 1 }),
    );

    render(<ScheduleDashboard />);

    await screen.findByRole("heading", { name: "Английский язык" });
    expect(
      screen.queryByRole("button", { name: /Добавить ДЗ/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Изменить/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Zeta AI/i })).not.toBeInTheDocument();
  });

  it("switches the visible day when a week strip day is clicked", async () => {
    const user = userEvent.setup();
    const otherDay = today.getDay() === 0 ? addDays(today, -1) : addDays(today, 1);
    mockedApi.getWeekSchedule.mockResolvedValue([
      apiPair({
        id: "33333333-3333-3333-3333-333333333333",
        subject: "История России",
        day_of_week: currentDayName(otherDay),
      }),
    ]);
    mockedApi.getHomeworks.mockResolvedValue([]);

    render(<ScheduleDashboard />);

    expect(await screen.findByText("На этот день пар нет")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: `${currentDayName(otherDay)} ${otherDay.getDate()}`,
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "История России" }),
    ).toBeInTheDocument();
  });

  it("focuses the lesson requested through the lesson query parameter", async () => {
    window.history.replaceState(
      {},
      "",
      "/?lesson=22222222-2222-2222-2222-222222222222",
    );

    render(<ScheduleDashboard />);

    const mathHeading = await screen.findByRole("heading", {
      name: "Математический анализ",
    });
    await waitFor(() =>
      expect(mathHeading.closest("article")).toHaveAttribute("data-focused", "true"),
    );
  });

  it("shows an empty state when the group has no lessons", async () => {
    mockedApi.getWeekSchedule.mockResolvedValue([]);
    mockedApi.getHomeworks.mockResolvedValue([]);

    render(<ScheduleDashboard />);

    expect(await screen.findByText("На этот день пар нет")).toBeInTheDocument();
    expect(screen.getByText("Дедлайнов пока нет")).toBeInTheDocument();
  });
});
