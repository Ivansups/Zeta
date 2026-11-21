import { render, screen } from "@testing-library/react";

import { HomeworkDescription } from "./homework-description";

describe("HomeworkDescription", () => {
  it("renders markdown bold and bullet lists instead of raw markers", () => {
    render(
      <HomeworkDescription
        text={"**Параграф 3.1**\n- номера 45–50\n- конспект"}
      />,
    );

    expect(screen.getByText("Параграф 3.1").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("keeps plain single-line text intact", () => {
    render(<HomeworkDescription text="Решить задачи" />);

    expect(screen.getByText("Решить задачи").tagName).toBe("P");
  });
});
