import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { SchedulePair } from "../types";
import { HomeworkFormModal } from "./homework-form-modal";

const pair: SchedulePair = {
  id: "pair-1",
  date: "2026-11-17",
  startTime: "09:00",
  endTime: "10:30",
  subject: "Математический анализ",
  subgroup: 2,
  homeworks: [],
};

function renderModal(
  onSubmit = jest.fn().mockResolvedValue(undefined),
): ReturnType<typeof render> {
  return render(
    <HomeworkFormModal
      pair={pair}
      visible
      onClose={jest.fn()}
      onSubmit={onSubmit}
    />,
  );
}

describe("HomeworkFormModal", () => {
  it("requires a non-empty description", async () => {
    const onSubmit = jest.fn();

    await renderModal(onSubmit);

    await fireEvent.press(
      screen.getByRole("button", { name: "Сохранить ДЗ" }),
    );

    expect(screen.getByText("Добавьте описание задания")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ignores a whitespace-only description", async () => {
    const onSubmit = jest.fn();

    await renderModal(onSubmit);

    await fireEvent.changeText(
      screen.getByLabelText("Описание задания"),
      "   ",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Сохранить ДЗ" }),
    );

    expect(screen.getByText("Добавьте описание задания")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("defaults to the pair subgroup and date", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderModal(onSubmit);

    await fireEvent.changeText(
      screen.getByLabelText("Описание задания"),
      "Конспект параграфа",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Сохранить ДЗ" }),
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        pairId: "pair-1",
        subgroup: 2,
        description: "Конспект параграфа",
        date: "2026-11-17",
      }),
    );
  });

  it("submits the selected subgroup, date and trimmed description", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderModal(onSubmit);

    await fireEvent.press(
      screen.getByRole("button", { name: "Подгруппа 1" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "18.11" }));
    await fireEvent.changeText(
      screen.getByLabelText("Описание задания"),
      "  Решить задачи 12–18  ",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Сохранить ДЗ" }),
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        pairId: "pair-1",
        subgroup: 1,
        description: "Решить задачи 12–18",
        date: "2026-11-18",
      }),
    );
  });

  it("keeps the form open and reports an API error", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("network"));

    await renderModal(onSubmit);

    await fireEvent.changeText(
      screen.getByLabelText("Описание задания"),
      "Решить задачи",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Сохранить ДЗ" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          "Не удалось сохранить задание. Попробуйте ещё раз.",
        ),
      ).toBeTruthy(),
    );
    expect(screen.getByText("Новое домашнее задание")).toBeTruthy();
  });
});
