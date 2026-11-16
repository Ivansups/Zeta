import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { Homework, SchedulePair } from "../types";
import { ScheduleScreen } from "./schedule-screen";

const pair: SchedulePair = {
  id: "pair-1",
  date: "2026-11-17",
  startTime: "09:00",
  endTime: "10:30",
  subject: "Математический анализ",
  subgroup: null,
  homeworks: [],
};

const createdHomework: Homework = {
  id: "hw-1",
  pairId: "pair-1",
  subgroup: null,
  description: "Решить задачи 12–18",
  date: "2026-11-17",
};

describe("ScheduleScreen", () => {
  it("does not offer homework creation to a student", async () => {
    await render(
      <ScheduleScreen
        role="student"
        token={null}
        initialPairs={[pair]}
        onSubmitHomework={jest.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Добавить ДЗ" }),
    ).toBeNull();
  });

  it("creates homework and shows it in the schedule immediately", async () => {
    const onSubmitHomework = jest.fn().mockResolvedValue(createdHomework);

    await render(
      <ScheduleScreen
        role="elder"
        token="access-token"
        initialPairs={[pair]}
        onSubmitHomework={onSubmitHomework}
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Добавить ДЗ" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Описание задания"),
      "Решить задачи 12–18",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Сохранить ДЗ" }),
    );

    await waitFor(() =>
      expect(screen.getByText("Решить задачи 12–18")).toBeTruthy(),
    );
    expect(onSubmitHomework).toHaveBeenCalledWith({
      pairId: "pair-1",
      subgroup: null,
      description: "Решить задачи 12–18",
      date: "2026-11-17",
    });
    expect(screen.queryByText("Новое домашнее задание")).toBeNull();
  });

  it("attaches the created homework only to its pair", async () => {
    const otherPair: SchedulePair = {
      ...pair,
      id: "pair-2",
      subject: "Программирование на Python",
    };
    const onSubmitHomework = jest.fn().mockResolvedValue(createdHomework);

    await render(
      <ScheduleScreen
        role="elder"
        token="access-token"
        initialPairs={[pair, otherPair]}
        onSubmitHomework={onSubmitHomework}
      />,
    );

    await fireEvent.press(
      screen.getAllByRole("button", { name: "Добавить ДЗ" })[0],
    );
    await fireEvent.changeText(
      screen.getByLabelText("Описание задания"),
      "Решить задачи 12–18",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Сохранить ДЗ" }),
    );

    await waitFor(() =>
      expect(screen.getByText("Решить задачи 12–18")).toBeTruthy(),
    );
    expect(screen.getAllByText("Домашнего задания пока нет")).toHaveLength(1);
  });

  it("gives helpers access to the creation form", async () => {
    await render(
      <ScheduleScreen
        role="helper"
        token="access-token"
        initialPairs={[pair]}
        onSubmitHomework={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Добавить ДЗ" }),
    ).toBeTruthy();
  });

  it("does not add homework when the API call fails", async () => {
    const onSubmitHomework = jest.fn().mockRejectedValue(new Error("network"));

    await render(
      <ScheduleScreen
        role="elder"
        token="access-token"
        initialPairs={[pair]}
        onSubmitHomework={onSubmitHomework}
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Добавить ДЗ" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Описание задания"),
      "Решить задачи 12–18",
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
    expect(screen.queryByText("Домашнее задание")).toBeNull();
  });
});
