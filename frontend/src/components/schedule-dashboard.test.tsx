import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ScheduleDashboard } from "./schedule-dashboard";

describe("ScheduleDashboard - S-06 Homework Integration", () => {
  it("allows adding homework from lesson card and updates UI optimistically with toast", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    // Find English lesson card (which has no homework by default)
    const englishHeading = screen.getByRole("heading", { name: "Английский язык" });
    const englishCard = englishHeading.closest("article")!;
    expect(within(englishCard).getByText("Домашнего задания пока нет")).toBeInTheDocument();

    // Click "+ Добавить ДЗ" on the lesson card
    const addHwButton = within(englishCard).getByRole("button", {
      name: /\+?\s*Добавить ДЗ/i,
    });
    await user.click(addHwButton);

    // Modal opens, pre-selected with English lesson
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Пара")).toHaveValue("english-2026-10-15");

    // Enter description
    await user.type(
      screen.getByLabelText("Описание задания"),
      "Подготовить топик про технологии",
    );

    // Save
    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));

    // Modal closes
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Optimistic update: English card now immediately displays the new homework
    expect(
      within(englishCard).getByText("Подготовить топик про технологии"),
    ).toBeInTheDocument();
    expect(within(englishCard).queryByText("Домашнего задания пока нет")).not.toBeInTheDocument();

    // Toast notification is shown
    expect(screen.getByRole("status")).toHaveTextContent(
      "Задание для «Английский язык» сохранено",
    );
  });

  it("allows editing existing homework from lesson card and updates UI optimistically", async () => {
    const user = userEvent.setup();

    render(<ScheduleDashboard />);

    // Find Math lesson card (has homework by default)
    const mathHeading = screen.getByRole("heading", { name: "Математический анализ" });
    const mathCard = mathHeading.closest("article")!;
    expect(
      within(mathCard).getByText(/Исследовать ряды на сходимость/),
    ).toBeInTheDocument();

    // Click edit button on the card
    const editButton = within(mathCard).getByRole("button", {
      name: /Изменить|Редактировать/i,
    });
    await user.click(editButton);

    // Modal opens in edit mode
    expect(screen.getByRole("heading", { name: "Редактировать ДЗ" })).toBeInTheDocument();
    const descriptionInput = screen.getByLabelText("Описание задания");
    expect(descriptionInput).toHaveValue(
      "Исследовать ряды на сходимость, задачи 4.12–4.18",
    );

    // Edit description
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Разобрать теорию к коллоквиуму");

    // Save changes
    await user.click(screen.getByRole("button", { name: "Сохранить изменения" }));

    // Modal closed
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Card optimistically updated with new description
    expect(
      within(mathCard).getByText("Разобрать теорию к коллоквиуму"),
    ).toBeInTheDocument();

    // Toast indicates update
    expect(screen.getByRole("status")).toHaveTextContent(
      "Задание для «Математический анализ» обновлено",
    );
  });
});
