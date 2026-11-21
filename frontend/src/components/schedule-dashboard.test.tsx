import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api } from "@/lib/api";
import { apiHomework, apiPair, apiUser } from "@/lib/test-fixtures";

import { ScheduleDashboard } from "./schedule-dashboard";

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

beforeEach(() => {
  mockedApi.getMe.mockResolvedValue(
    apiUser({ id: "me", role: "elder", display_name: "Данил Шелудько", group_id: "group-1" }),
  );
  mockedApi.getDaySchedule.mockResolvedValue([
    apiPair({ id: "22222222-2222-2222-2222-222222222222", pair_number: 1, subject: "Математический анализ" }),
    apiPair({
      id: "11111111-1111-1111-1111-111111111111",
      pair_number: 2,
      subject: "Английский язык",
      lesson_type: "прак",
    }),
  ]);
  mockedApi.getWeekSchedule.mockResolvedValue([
    apiPair({ id: "22222222-2222-2222-2222-222222222222", pair_number: 1, subject: "Математический анализ" }),
    apiPair({
      id: "11111111-1111-1111-1111-111111111111",
      pair_number: 2,
      subject: "Английский язык",
      lesson_type: "прак",
    }),
  ]);
  mockedApi.getHomeworks.mockResolvedValue([
    apiHomework({ id: "hw-math", schedule_pair_id: "22222222-2222-2222-2222-222222222222", description: "Ряды" }),
  ]);
  mockedApi.createHomework.mockResolvedValue(apiHomework({ id: "hw-new" }));
});

afterEach(() => {
  jest.clearAllMocks();
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

  it("adds homework from a lesson card and persists it through the API", async () => {
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

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

  it("edits existing homework from a lesson card", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    const mathHeading = await screen.findByRole("heading", {
      name: "Математический анализ",
    });
    const mathCard = mathHeading.closest("article")!;
    expect(within(mathCard).getByText("Ряды")).toBeInTheDocument();

    await user.click(within(mathCard).getByRole("button", { name: /Редактировать/i }));
    expect(screen.getByLabelText("Описание задания")).toHaveValue("Ряды");

    await user.clear(screen.getByLabelText("Описание задания"));
    await user.type(screen.getByLabelText("Описание задания"), "Ряды и интегралы");
    await user.click(screen.getByRole("button", { name: "Сохранить изменения" }));

    expect(within(mathCard).getByText("Ряды и интегралы")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Задание для «Математический анализ» обновлено",
    );
  });

  it("opens the Zeta AI assistant and saves the parsed homework", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    await screen.findByRole("heading", { name: "Математический анализ" });

    await user.click(screen.getByRole("button", { name: /Zeta AI/i }));
    await user.type(
      screen.getByLabelText("Текст для разбора"),
      "по матану решить номера 12–18 к четвергу",
    );
    await user.click(screen.getByRole("button", { name: /Разобрать текст/i }));

    expect(
      screen.getByText("Черновик распознан Zeta AI"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Сохранить в расписание" }),
    );

    expect(mockedApi.createHomework).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/сохранено|обновлено/);
  });

  it("shows an empty state when the group has no lessons", async () => {
    mockedApi.getDaySchedule.mockResolvedValue([]);
    mockedApi.getWeekSchedule.mockResolvedValue([]);
    mockedApi.getHomeworks.mockResolvedValue([]);

    render(<ScheduleDashboard />);

    expect(await screen.findByText("На этот день пар нет")).toBeInTheDocument();
    expect(screen.getByText("Дедлайнов пока нет")).toBeInTheDocument();
  });
});
