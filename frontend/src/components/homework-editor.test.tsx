import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HomeworkEditor } from "./homework-editor";

describe("HomeworkEditor", () => {
  it("validates required description and does not submit empty or whitespace text", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(<HomeworkEditor open onClose={jest.fn()} onSave={onSave} />);

    // Click submit with empty form
    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));
    expect(screen.getByText("Добавьте описание задания")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    // Type only whitespace
    await user.type(screen.getByLabelText("Описание задания"), "   \n  \t  ");
    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));
    expect(screen.getByText("Добавьте описание задания")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("validates required due date", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(<HomeworkEditor open onClose={jest.fn()} onSave={onSave} />);

    await user.type(
      screen.getByLabelText("Описание задания"),
      "Прочитать главу 4 конспекта",
    );
    const dueDateInput = screen.getByLabelText("Дата сдачи");
    await user.clear(dueDateInput);

    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));
    expect(screen.getByText("Укажите дату сдачи")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits a new homework draft with all fields (lesson, subgroup, due date, description)", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(<HomeworkEditor open onClose={jest.fn()} onSave={onSave} />);

    // Select lesson
    await user.selectOptions(screen.getByLabelText("Пара"), "python-2026-10-15");

    // Select subgroup
    await user.selectOptions(screen.getByLabelText("Подгруппа"), "1");

    // Enter due date
    const dueDateInput = screen.getByLabelText("Дата сдачи");
    await user.clear(dueDateInput);
    await user.type(dueDateInput, "2026-10-22");

    // Enter description
    await user.type(
      screen.getByLabelText("Описание задания"),
      "Решить задачи 12–18 из практикума",
    );

    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));

    expect(onSave).toHaveBeenCalledWith({
      lessonId: "python-2026-10-15",
      subgroup: 1,
      dueDate: "2026-10-22",
      description: "Решить задачи 12–18 из практикума",
    });
  });

  it("supports edit mode with prefilled initial data", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    const initialData = {
      id: "hw-edit-1",
      lessonId: "discrete-2026-10-16",
      subgroup: "all" as const,
      dueDate: "2026-10-23",
      description: "Старое описание задания",
    };

    render(
      <HomeworkEditor
        open
        initialData={initialData}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    // Title indicates editing mode
    expect(screen.getByRole("heading", { name: "Редактировать ДЗ" })).toBeInTheDocument();

    const descriptionInput = screen.getByLabelText("Описание задания");
    expect(descriptionInput).toHaveValue("Старое описание задания");

    const dueDateInput = screen.getByLabelText("Дата сдачи");
    expect(dueDateInput).toHaveValue("2026-10-23");

    // Modify description
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Обновлённое задание по дискретной математике");

    await user.click(screen.getByRole("button", { name: "Сохранить изменения" }));

    expect(onSave).toHaveBeenCalledWith({
      id: "hw-edit-1",
      lessonId: "discrete-2026-10-16",
      subgroup: "all",
      dueDate: "2026-10-23",
      description: "Обновлённое задание по дискретной математике",
    });
  });

  it("validates empty prompt in assistant mode", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <HomeworkEditor
        open
        initialMode="assistant"
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Разобрать текст|Распознать с AI/i }));
    expect(screen.getByText("Введите текст задания для разбора")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("parses free text with AI into structured draft preview with auto-selected subject and date", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <HomeworkEditor
        open
        initialMode="assistant"
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    await user.type(
      screen.getByLabelText("Текст для разбора"),
      "по матану решить номера 12–18 к четвергу",
    );
    await user.click(screen.getByRole("button", { name: /Разобрать текст|Распознать с AI/i }));

    // Preview shows recognized draft
    expect(screen.getByRole("heading", { name: "Предпросмотр черновика" })).toBeInTheDocument();
    expect(screen.getByLabelText("Пара")).toHaveValue("math-2026-10-15");
    expect(screen.getByLabelText("Дата сдачи")).toHaveValue("2026-10-15");
    expect(screen.getByLabelText("Описание задания")).toHaveValue("решить номера 12–18");
  });

  it("allows editing the AI-recognized draft before saving to schedule", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <HomeworkEditor
        open
        initialMode="assistant"
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    await user.type(
      screen.getByLabelText("Текст для разбора"),
      "по матану решить номера 12–18 к четвергу",
    );
    await user.click(screen.getByRole("button", { name: /Разобрать текст|Распознать с AI/i }));

    // Edit fields in preview
    const descriptionInput = screen.getByLabelText("Описание задания");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "решить номера 12–18 и повторить теорию");

    const dueDateInput = screen.getByLabelText("Дата сдачи");
    await user.clear(dueDateInput);
    await user.type(dueDateInput, "2026-10-22");

    // Save to schedule
    await user.click(screen.getByRole("button", { name: "Сохранить в расписание" }));

    expect(onSave).toHaveBeenCalledWith({
      lessonId: "math-2026-10-15",
      subgroup: "all",
      dueDate: "2026-10-22",
      description: "решить номера 12–18 и повторить теорию",
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<HomeworkEditor open onClose={onClose} onSave={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onClose).toHaveBeenCalled();
  });
});
