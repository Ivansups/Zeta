import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HomeworkEditor } from "./homework-editor";

describe("HomeworkEditor", () => {
  it("validates and submits a homework draft", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(<HomeworkEditor open onClose={jest.fn()} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));
    expect(screen.getByText("Добавьте описание задания")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Описание задания"),
      "Решить задачи 12–18 из практикума",
    );
    await user.click(screen.getByRole("button", { name: "Сохранить ДЗ" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Решить задачи 12–18 из практикума" }),
    );
  });
});
