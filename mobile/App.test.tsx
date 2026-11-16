import { render, screen } from "@testing-library/react-native";

import App from "./App";

describe("App", () => {
  it("renders the mobile schedule", async () => {
    await render(<App />);

    expect(screen.getByText("Расписание")).toBeTruthy();
  });
});
