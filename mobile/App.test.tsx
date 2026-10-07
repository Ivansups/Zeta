import { render, screen } from "@testing-library/react-native";

import App from "./App";

describe("App", () => {
  it("shows the project name", async () => {
    await render(<App />);

    expect(screen.getByText("Zeta")).toBeTruthy();
  });
});
