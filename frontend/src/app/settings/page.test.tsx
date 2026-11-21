import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api } from "@/lib/api";
import { apiUser } from "@/lib/test-fixtures";

import SettingsPage from "./page";

jest.mock("@/lib/api", () => ({
  api: {
    getMe: jest.fn(),
    leaveGroup: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe("SettingsPage - Group Settings", () => {
  beforeEach(() => {
    mockedApi.getMe.mockResolvedValue(
      apiUser({
        id: "user-1",
        role: "student",
        group_id: "group-101",
        group_name: "ИУ5-11Б",
        subgroup_number: 2,
        display_name: "Иван Иванов",
      }),
    );
    mockedApi.leaveGroup.mockResolvedValue(
      apiUser({
        id: "user-1",
        role: "student",
        group_id: null,
        group_name: null,
        subgroup_number: null,
        display_name: "Иван Иванов",
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("displays group name, subgroup and role when user belongs to a group", async () => {
    render(<SettingsPage />);

    expect(await screen.findByText("ИУ5-11Б")).toBeInTheDocument();
    expect(screen.getByText("Студент · Подгруппа 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Покинуть группу" }),
    ).toBeInTheDocument();
  });

  it("opens confirmation modal and can cancel leaving the group", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const leaveButton = await screen.findByRole("button", {
      name: "Покинуть группу",
    });
    await user.click(leaveButton);

    expect(
      screen.getByRole("dialog", { name: "Покинуть группу" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Вы уверены, что хотите покинуть группу «ИУ5-11Б»?"),
    ).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: "Отмена" });
    await user.click(cancelButton);

    expect(
      screen.queryByRole("dialog", { name: "Покинуть группу" }),
    ).not.toBeInTheDocument();
    expect(mockedApi.leaveGroup).not.toHaveBeenCalled();
  });

  it("leaves group on confirmation, shows toast feedback and updates card to empty state", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(
      await screen.findByRole("button", { name: "Покинуть группу" }),
    );

    const confirmButtons = screen.getAllByRole("button", {
      name: "Покинуть группу",
    });
    // The button inside modal
    const confirmButton = confirmButtons[confirmButtons.length - 1];
    await user.click(confirmButton);

    expect(mockedApi.leaveGroup).toHaveBeenCalledTimes(1);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Вы успешно покинули группу",
    );

    expect(
      await screen.findByText("Вы не состоите в учебной группе"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Создать группу" }),
    ).toHaveAttribute("href", "/admin");
  });

  it("displays error message in modal and toast if leaving group fails", async () => {
    mockedApi.leaveGroup.mockRejectedValueOnce(
      new Error("Вы староста группы. Назначьте нового старосту перед выходом."),
    );
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(
      await screen.findByRole("button", { name: "Покинуть группу" }),
    );

    const confirmButtons = screen.getAllByRole("button", {
      name: "Покинуть группу",
    });
    const confirmButton = confirmButtons[confirmButtons.length - 1];
    await user.click(confirmButton);

    expect(mockedApi.leaveGroup).toHaveBeenCalledTimes(1);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Вы староста группы. Назначьте нового старосту перед выходом.",
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Вы староста группы. Назначьте нового старосту перед выходом.",
    );
  });

  it("displays empty group card when user has no group", async () => {
    mockedApi.getMe.mockResolvedValue(
      apiUser({
        id: "user-2",
        role: "student",
        group_id: null,
        group_name: null,
      }),
    );

    render(<SettingsPage />);

    expect(
      await screen.findByText("Вы не состоите в учебной группе"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Создать группу" }),
    ).toHaveAttribute("href", "/admin");
  });
});
