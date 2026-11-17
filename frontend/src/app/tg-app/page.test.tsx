import { render, screen } from "@testing-library/react";

import TgAppPage from "./page";

describe("TgAppPage", () => {
  afterEach(() => {
    delete window.Telegram;
  });

  it("renders the Mini App route with guidance outside Telegram", async () => {
    render(<TgAppPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /внутри Telegram/i,
    );
  });
});
