import { render, screen } from "@testing-library/react";

import Home from "./page";

describe("Home", () => {
  it("renders the project name as a heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Zeta" }),
    ).toBeInTheDocument();
  });
});
