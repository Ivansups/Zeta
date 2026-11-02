import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HomeworkPage from "./page";

describe("HomeworkPage", () => {
  it("renders the homework kanban with the active navigation item", () => {
    render(<HomeworkPage />);

    expect(screen.getByRole("heading", { name: "Домашние задания" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Задания" }).some(
        (link) => link.getAttribute("aria-current") === "page",
      ),
    ).toBe(true);
    expect(screen.getByText("Исследовать ряды на сходимость, задачи 4.12–4.18")).toBeInTheDocument();
    expect(screen.queryByText("Реализовать красно-чёрное дерево и оценить сложность операций")).not.toBeInTheDocument();
  });

  it("filters cards by subgroup without introducing homework statuses", async () => {
    const user = userEvent.setup();

    render(<HomeworkPage />);

    await user.click(screen.getByRole("button", { name: "Подгруппа 2" }));

    expect(screen.queryByText("Дополнить CLI-проект обработкой ошибок и тестами")).not.toBeInTheDocument();
    expect(screen.getByText("Реализовать красно-чёрное дерево и оценить сложность операций")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Сегодня" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Завтра" })).toBeInTheDocument();
    expect(screen.queryByText("В работе")).not.toBeInTheDocument();
    expect(screen.queryByText("Готово")).not.toBeInTheDocument();
  });
});
