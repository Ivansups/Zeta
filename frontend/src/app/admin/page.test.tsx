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
    createGroup: jest.fn(),
    listAdminGroups: jest.fn(),
    setGroupElder: jest.fn(),
    listGroupHelpers: jest.fn(),
    addGroupHelper: jest.fn(),
    removeGroupHelper: jest.fn(),
    listMyHelperGroups: jest.fn(),
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
    mockedApi.createGroup.mockResolvedValue({
      id: "new-group-id",
      name: "IU5-11B",
      faculty: "ФИТ",
      university: "МГТУ",
      created_at: "2026-11-21T00:00:00Z",
    });
    mockedApi.listAdminGroups.mockResolvedValue([]);
    mockedApi.listMyHelperGroups.mockResolvedValue([]);
    mockedApi.setGroupElder.mockResolvedValue(
      apiUser({ id: "user-alina", role: "elder" }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows invitation controls and marks management navigation active, hiding create_group tab for elder", async () => {
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
    expect(screen.queryByRole("tab", { name: "Создать группу" })).not.toBeInTheDocument();
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

  it("allows promoting a student to helper", async () => {
    const user = userEvent.setup();

    render(<AdminPage />);

    await screen.findByRole("button", { name: "Создать ссылку для подгруппы 1" });
    await user.click(screen.getByRole("tab", { name: "Студенты" }));

    await user.click(
      screen.getByRole("button", { name: "Сделать помощником: Алина Морозова" }),
    );

    expect(mockedApi.setUserRole).toHaveBeenCalledWith("user-alina", "helper");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Алина Морозова теперь помощник",
    );
  });

  it("shows create_group tab if user is an admin even when in a group", async () => {
    mockedApi.getMe.mockResolvedValue(
      apiUser({ id: "admin-1", role: "admin", group_id: "group-1" }),
    );

    render(<AdminPage />);

    expect(await screen.findByRole("tab", { name: "Создать группу" })).toBeInTheDocument();
  });

  it("defaults to create_group tab when user has no group and allows creating one with toast feedback", async () => {
    mockedApi.getMe
      .mockResolvedValueOnce(
        apiUser({ id: "newbie", role: "student", group_id: null }),
      )
      .mockResolvedValueOnce(
        apiUser({ id: "newbie", role: "elder", group_id: "new-group-id", group_name: "IU5-11B" }),
      );
    const user = userEvent.setup();

    render(<AdminPage />);

    expect(
      await screen.findByRole("heading", { name: "Создать новую учебную группу" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Создать группу" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.type(screen.getByPlaceholderText("Например, ПИ-221"), "IU5-11B");
    await user.click(
      screen.getByRole("button", { name: "Зарегистрировать группу" }),
    );

    expect(mockedApi.createGroup).toHaveBeenCalledWith({
      name: "IU5-11B",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Группа «IU5-11B» успешно создана! Вы назначены старостой.",
    );
  });

  it("shows all_groups tab for admin and allows switching active group context and appointing elder", async () => {
    mockedApi.getMe.mockResolvedValue(
      apiUser({ id: "admin-1", role: "admin", display_name: "Иван Суперадмин" }),
    );
    mockedApi.listAdminGroups.mockResolvedValue([
      {
        id: "group-1",
        name: "ИУ5-11Б",
        faculty: "ИУ",
        university: "МГТУ",
        created_at: "2026-11-20T00:00:00Z",
        elder: apiUser({ id: "elder-1", role: "elder", display_name: "Староста Иван" }),
        helpers: [apiUser({ id: "helper-1", role: "helper", display_name: "Хелпер Петр" })],
        students_count: 25,
      },
      {
        id: "group-2",
        name: "ИУ5-12Б",
        faculty: "ИУ",
        university: "МГТУ",
        created_at: "2026-11-20T00:00:00Z",
        elder: null,
        helpers: [],
        students_count: 22,
      },
    ]);

    const user = userEvent.setup();
    render(<AdminPage />);

    expect(await screen.findByRole("tab", { name: "Все группы" })).toBeInTheDocument();
    expect(await screen.findByText("ИУ5-11Б")).toBeInTheDocument();
    expect(await screen.findByText("ИУ5-12Б")).toBeInTheDocument();
    expect(screen.getByText("Староста Иван")).toBeInTheDocument();
    expect(screen.getByText("Хелпер Петр")).toBeInTheDocument();

    // Select group 2
    const manageBtn = screen.getByRole("button", { name: "Выбрать группу ИУ5-12Б" });
    await user.click(manageBtn);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Выбрана активная группа для управления",
    );

    // Appoint elder
    const changeElderBtn = screen.getByRole("button", { name: "Сменить старосту ИУ5-12Б" });
    await user.click(changeElderBtn);

    const input = screen.getByLabelText("UUID нового старосты");
    await user.type(input, "student-uuid-123");
    await user.click(screen.getByRole("button", { name: "Назначить" }));

    expect(mockedApi.setGroupElder).toHaveBeenCalledWith("group-2", "student-uuid-123");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Староста группы успешно назначен",
    );
  });
});
