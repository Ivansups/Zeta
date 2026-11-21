import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HomeworkEditor } from "./homework-editor";
import { testLessons } from "@/lib/test-fixtures";

describe("HomeworkEditor", () => {
  it("validates required description and does not submit empty or whitespace text", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(<HomeworkEditor open lessons={testLessons} onClose={jest.fn()} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));
    expect(screen.getByText("Добавьте описание задания")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Описание задания"), "   \n  \t  ");
    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));
    expect(screen.getByText("Добавьте описание задания")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("validates required due date", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(<HomeworkEditor open lessons={testLessons} onClose={jest.fn()} onSave={onSave} />);

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

    render(<HomeworkEditor open lessons={testLessons} onClose={jest.fn()} onSave={onSave} />);

    await user.selectOptions(screen.getByLabelText("Пара"), "python-2026-10-15");
    await user.selectOptions(screen.getByLabelText("Подгруппа"), "1");

    const dueDateInput = screen.getByLabelText("Дата сдачи");
    await user.clear(dueDateInput);
    await user.type(dueDateInput, "2026-10-22");

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
        lessons={testLessons}
        initialData={initialData}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole("heading", { name: "Редактировать ДЗ" })).toBeInTheDocument();

    const descriptionInput = screen.getByLabelText("Описание задания");
    expect(descriptionInput).toHaveValue("Старое описание задания");

    const dueDateInput = screen.getByLabelText("Дата сдачи");
    expect(dueDateInput).toHaveValue("2026-10-23");

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
        lessons={testLessons}
        initialMode="assistant"
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Разобрать текст|Распознать с AI/i }));
    expect(screen.getByText("Введите текст задания для разбора")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("parses free text through the assistant and prefills subject and date", async () => {
    const user = userEvent.setup();
    const onParse = jest.fn().mockResolvedValue({
      subject: "Математический анализ",
      description: "решить номера 12–18",
      deadline: "2026-10-15T23:59:00Z",
      subgroup: null,
    });

    render(
      <HomeworkEditor
        open
        lessons={testLessons}
        initialMode="assistant"
        onClose={jest.fn()}
        onSave={jest.fn()}
        onParse={onParse}
      />,
    );

    await user.type(
      screen.getByLabelText("Текст для разбора"),
      "по матану решить номера 12–18 к четвергу",
    );
    await user.click(screen.getByRole("button", { name: /Разобрать текст|Распознать с AI/i }));

    expect(
      await screen.findByRole("heading", { name: "Предпросмотр черновика" }),
    ).toBeInTheDocument();
    expect(onParse).toHaveBeenCalledWith("по матану решить номера 12–18 к четвергу");
    expect(screen.getByLabelText("Пара")).toHaveValue("math-2026-10-15");
    expect(screen.getByLabelText("Дата сдачи")).toHaveValue("2026-10-15");
    expect(screen.getByLabelText("Описание задания")).toHaveValue("решить номера 12–18");
  });

  it("allows editing the AI-recognized draft before saving to schedule", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onParse = jest.fn().mockResolvedValue({
      subject: "Математический анализ",
      description: "решить номера 12–18",
      deadline: "2026-10-15T23:59:00Z",
      subgroup: null,
    });

    render(
      <HomeworkEditor
        open
        lessons={testLessons}
        initialMode="assistant"
        onClose={jest.fn()}
        onSave={onSave}
        onParse={onParse}
      />,
    );

    await user.type(
      screen.getByLabelText("Текст для разбора"),
      "по матану решить номера 12–18 к четвергу",
    );
    await user.click(screen.getByRole("button", { name: /Разобрать текст|Распознать с AI/i }));
    await screen.findByRole("heading", { name: "Предпросмотр черновика" });

    const descriptionInput = screen.getByLabelText("Описание задания");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "решить номера 12–18 и повторить теорию");

    const dueDateInput = screen.getByLabelText("Дата сдачи");
    await user.clear(dueDateInput);
    await user.type(dueDateInput, "2026-10-22");

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

    render(
      <HomeworkEditor open lessons={testLessons} onClose={onClose} onSave={jest.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <HomeworkEditor open lessons={testLessons} onClose={onClose} onSave={jest.fn()} />,
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("requires a second click to delete an existing homework", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn().mockResolvedValue(undefined);

    render(
      <HomeworkEditor
        open
        lessons={testLessons}
        initialData={{
          id: "hw-math",
          lessonId: "math-2026-10-15",
          subgroup: "all",
          dueDate: "2026-10-15",
          description: "Исследовать ряды на сходимость",
        }}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Удалить" }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Удалить безвозвратно" }));
    expect(onDelete).toHaveBeenCalledWith("hw-math");
  });

  it("keeps the dialog open and shows the error when saving is rejected", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onSave = jest.fn().mockRejectedValue(new Error("Нет прав на сохранение"));

    render(
      <HomeworkEditor open lessons={testLessons} onClose={onClose} onSave={onSave} />,
    );

    await user.type(screen.getByLabelText("Описание задания"), "Черновик задания");
    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));

    expect(await screen.findByText("Нет прав на сохранение")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
