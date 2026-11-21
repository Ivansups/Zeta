import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api } from "@/lib/api";
import { apiInvite, apiUser } from "@/lib/test-fixtures";

import AdminPage from "./page";

jest.mock("@/lib/api", () => ({
  api: {
    getMe: jest.fn(),
    listInvites: jest.fn(),
    createStudentInvite: jest.fn(),
    revokeInvite: jest.fn(),
    listUsers: jest.fn(),
    setUserRole: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe("AdminPage", () => {
  beforeEach(() => {
    mockedApi.getMe.mockResolvedValue(
      apiUser({ id: "me", role: "elder", display_name: "Данил Шелудько" }),
    );
    mockedApi.listInvites.mockResolvedValue([]);
    mockedApi.createStudentInvite.mockResolvedValue(
      apiInvite({ id: "invite-1", subgroup_number: 1, invite_url: "/invite/token-1" }),
    );
    mockedApi.revokeInvite.mockResolvedValue(undefined);
    mockedApi.listUsers.mockResolvedValue([
      apiUser({ id: "user-danil", role: "elder", display_name: "Данил Шелудько" }),
      apiUser({
        id: "user-alina",
        role: "student",
        display_name: "Алина Морозова",
        telegram_id: 1002,
      }),
    ]);
    mockedApi.setUserRole.mockResolvedValue(
      apiUser({ id: "user-alina", role: "elder", display_name: "Алина Морозова" }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows invitation controls and marks management navigation active", async () => {
    render(<AdminPage />);

    expect(
      screen.getByRole("heading", { name: "Управление группой" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Управление" })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
    expect(
      await screen.findByRole("tab", { name: "Приглашения" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Подгруппа 1")).toBeInTheDocument();
  });

  it("creates, copies and revokes an invitation link with accessible feedback", async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<AdminPage />);

    await screen.findByRole("tab", { name: "Приглашения" });

    await user.click(
      await screen.findByRole("button", {
        name: "Создать ссылку для подгруппы 1",
      }),
    );

    const invitation = await screen.findByLabelText("Ссылка для подгруппы 1");
    expect((invitation as HTMLInputElement).value).toContain("/invite/");

    await user.click(
      screen.getByRole("button", { name: "Копировать ссылку для подгруппы 1" }),
    );

    expect(writeText).toHaveBeenCalledWith((invitation as HTMLInputElement).value);
    expect(screen.getByRole("status")).toHaveTextContent("Ссылка скопирована");

    await user.click(
      screen.getByRole("button", { name: "Отозвать ссылку для подгруппы 1" }),
    );

    expect(mockedApi.revokeInvite).toHaveBeenCalledWith("invite-1");
    expect(
      screen.queryByLabelText("Ссылка для подгруппы 1"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ссылка отозвана");
  });

  it("lists students from the API and transfers the head role", async () => {
    const user = userEvent.setup();

    render(<AdminPage />);

    await screen.findByRole("button", { name: "Создать ссылку для подгруппы 1" });
    await user.click(screen.getByRole("tab", { name: "Студенты" }));

    expect(await screen.findByText("Алина Морозова")).toBeInTheDocument();
    expect(screen.getByText("2 участников")).toBeInTheDocument();
    expect(
      within(screen.getByRole("listitem", { name: "Данил Шелудько" })).getByText(
        "Староста",
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Назначить старостой: Алина Морозова" }),
    );

    expect(mockedApi.setUserRole).toHaveBeenCalledWith("user-alina", "elder");
    expect(
      screen.getByRole("listitem", { name: "Алина Морозова" }),
    ).toHaveTextContent("Староста");
    expect(
      screen.getByRole("listitem", { name: "Данил Шелудько" }),
    ).toHaveTextContent("Студент");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Алина Морозова теперь староста",
    );
  });
});
