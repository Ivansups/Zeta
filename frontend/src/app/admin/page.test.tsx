import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdminPage from "./page";

describe("AdminPage", () => {
  it("shows invitation controls and marks management navigation active", () => {
    render(<AdminPage />);

    expect(screen.getByRole("heading", { name: "Управление группой" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Управление" }).some(
        (link) => link.getAttribute("aria-current") === "page",
      ),
    ).toBe(true);
    expect(screen.getByRole("tab", { name: "Приглашения" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Подгруппа 1")).toBeInTheDocument();
    expect(screen.getByText("Подгруппа 2")).toBeInTheDocument();
  });

  it("creates, copies and revokes an invitation link with accessible feedback", async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<AdminPage />);

    await user.click(screen.getByRole("button", { name: "Создать ссылку для подгруппы 1" }));

    const invitation = screen.getByLabelText("Ссылка для подгруппы 1");
    expect((invitation as HTMLInputElement).value).toContain("/invite/");

    await user.click(screen.getByRole("button", { name: "Копировать ссылку для подгруппы 1" }));

    expect(writeText).toHaveBeenCalledWith((invitation as HTMLInputElement).value);
    expect(screen.getByRole("status")).toHaveTextContent("Ссылка скопирована");

    await user.click(screen.getByRole("button", { name: "Отозвать ссылку для подгруппы 1" }));

    expect(screen.queryByLabelText("Ссылка для подгруппы 1")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ссылка отозвана");
  });

  it("lists students and lets the head student transfer their role", async () => {
    const user = userEvent.setup();

    render(<AdminPage />);

    await user.click(screen.getByRole("tab", { name: "Студенты" }));

    expect(screen.getByText("6 участников")).toBeInTheDocument();
    expect(screen.getByText("Алина Морозова")).toBeInTheDocument();
    expect(screen.getByText("Кирилл Белов")).toBeInTheDocument();
    expect(
      within(screen.getByRole("listitem", { name: "Данил Шелудько" })).getByText("Староста"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Назначить старостой: Алина Морозова" }));

    expect(screen.getByRole("listitem", { name: "Алина Морозова" })).toHaveTextContent("Староста");
    expect(screen.getByRole("listitem", { name: "Данил Шелудько" })).toHaveTextContent("Студент");
    expect(screen.getByRole("status")).toHaveTextContent("Алина Морозова теперь староста");
  });
});
