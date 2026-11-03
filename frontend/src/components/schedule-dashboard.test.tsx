import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ScheduleDashboard } from "./schedule-dashboard";

describe("ScheduleDashboard - S-06 & S-11 Homework Integration", () => {
  it("allows adding homework from lesson card and updates UI optimistically with toast", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    const englishHeading = screen.getByRole("heading", { name: "Английский язык" });
    const englishCard = englishHeading.closest("article")!;
    expect(within(englishCard).getByText("Домашнего задания пока нет")).toBeInTheDocument();

    const addHwButton = within(englishCard).getByRole("button", {
      name: /\+?\s*Добавить ДЗ/i,
    });
    await user.click(addHwButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Пара")).toHaveValue("english-2026-10-15");

    await user.type(
      screen.getByLabelText("Описание задания"),
      "Подготовить топик про технологии",
    );

    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(
      within(englishCard).getByText("Подготовить топик про технологии"),
    ).toBeInTheDocument();
    expect(within(englishCard).queryByText("Домашнего задания пока нет")).not.toBeInTheDocument();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Задание для «Английский язык» сохранено",
    );
  });

  it("allows editing existing homework from lesson card and updates UI optimistically", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    const mathHeading = screen.getByRole("heading", { name: "Математический анализ" });
    const mathCard = mathHeading.closest("article")!;
    expect(
      within(mathCard).getByText(/Исследовать ряды на сходимость/),
    ).toBeInTheDocument();

    const editButton = within(mathCard).getByRole("button", {
      name: /Изменить|Редактировать/i,
    });
    await user.click(editButton);

    expect(screen.getByRole("heading", { name: "Редактировать ДЗ" })).toBeInTheDocument();
    const descriptionInput = screen.getByLabelText("Описание задания");
    expect(descriptionInput).toHaveValue(
      "Исследовать ряды на сходимость, задачи 4.12–4.18",
    );

    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Разобрать теорию к коллоквиуму");

    await user.click(screen.getByRole("button", { name: "Сохранить изменения" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(
      within(mathCard).getByText("Разобрать теорию к коллоквиуму"),
    ).toBeInTheDocument();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Задание для «Математический анализ» обновлено",
    );
  });

  it("opens Zeta AI assistant mode from header and saves parsed homework", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    const aiButton = screen.getByRole("button", { name: /Zeta AI/i });
    await user.click(aiButton);

    expect(screen.getByRole("heading", { name: "Черновик с Zeta AI" })).toBeInTheDocument();
    const promptInput = screen.getByLabelText("Текст для разбора");
    await user.type(promptInput, "по английскому подготовить презентацию к пятнице");

    await user.click(screen.getByRole("button", { name: "Разобрать текст" }));

    expect(screen.getByRole("heading", { name: "Предпросмотр черновика" })).toBeInTheDocument();
    expect(screen.getByLabelText("Пара")).toHaveValue("english-2026-10-15");
    expect(screen.getByLabelText("Дата сдачи")).toHaveValue("2026-10-16");
    expect(screen.getByLabelText("Описание задания")).toHaveValue("подготовить презентацию");

    await user.click(screen.getByRole("button", { name: "Сохранить в расписание" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const englishHeading = screen.getByRole("heading", { name: "Английский язык" });
    const englishCard = englishHeading.closest("article")!;
    expect(within(englishCard).getByText("подготовить презентацию")).toBeInTheDocument();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Задание для «Английский язык» сохранено",
    );
  });
});
