import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Home from "./page";

describe("Home", () => {
  it("shows the schedule and switches subgroups", async () => {
    const user = userEvent.setup();

    render(<Home />);

    expect(screen.getByRole("heading", { name: "Расписание" })).toBeInTheDocument();
    expect(screen.getAllByText("Математический анализ").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Подгруппа 2" }));

    expect(screen.getAllByText("Алгоритмы и структуры данных").length).toBeGreaterThan(0);
  });
});
