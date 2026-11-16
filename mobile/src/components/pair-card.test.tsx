import { fireEvent, render, screen } from "@testing-library/react-native";

import type { SchedulePair } from "../types";
import { PairCard } from "./pair-card";

const pair: SchedulePair = {
  id: "pair-1",
  date: "2026-11-17",
  startTime: "09:00",
  endTime: "10:30",
  subject: "Математический анализ",
  subgroup: null,
  homeworks: [],
};

describe("PairCard", () => {
  it("hides the add button from students", async () => {
    await render(
      <PairCard pair={pair} role="student" onAddHomework={jest.fn()} />,
    );

    expect(
      screen.queryByRole("button", { name: "Добавить ДЗ" }),
    ).toBeNull();
  });

  it("lets an elder open the homework form for the pair", async () => {
    const onAddHomework = jest.fn();

    await render(
      <PairCard pair={pair} role="elder" onAddHomework={onAddHomework} />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Добавить ДЗ" }),
    );

    expect(onAddHomework).toHaveBeenCalledWith(pair);
  });

  it("shows existing homework", async () => {
    await render(
      <PairCard
        pair={{
          ...pair,
          homeworks: [
            {
              id: "hw-1",
              pairId: "pair-1",
              subgroup: null,
              description: "Решить задачи 12–18",
              date: "2026-11-17",
            },
          ],
        }}
        role="student"
        onAddHomework={jest.fn()}
      />,
    );

    expect(screen.getByText("Решить задачи 12–18")).toBeTruthy();
  });
});
