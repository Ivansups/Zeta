import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams, useRouter } from "next/navigation";

import { api, type ApiInvitePreview } from "@/lib/api";
import { apiUser } from "@/lib/test-fixtures";

import InvitePage from "./page";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  api: {
    getMeQuiet: jest.fn(),
    getInvitePreview: jest.fn(),
    joinGroup: jest.fn(),
  },
}));

const mockedParams = useParams as jest.Mock;
const mockedRouter = useRouter as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

function preview(overrides: Partial<ApiInvitePreview> = {}): ApiInvitePreview {
  return {
    group_id: "group-1",
    group_name: "ИУ5-11Б",
    subgroup_number: 2,
    role: "student",
    elder_name: "Иван Иванов",
    ...overrides,
  };
}

describe("InvitePage", () => {
  const push = jest.fn();
  const replace = jest.fn();

  beforeEach(() => {
    mockedParams.mockReturnValue({ token: "test-token-123" });
    mockedRouter.mockReturnValue({ push, replace });
    mockedApi.getInvitePreview.mockResolvedValue(preview());
    mockedApi.getMeQuiet.mockResolvedValue(apiUser({ id: "user-1", group_id: null }));
    push.mockClear();
    replace.mockClear();
    jest.clearAllMocks();
  });

  it("shows a group preview without joining automatically", async () => {
    render(<InvitePage />);

    expect(await screen.findByRole("heading", { name: "ИУ5-11Б" })).toBeInTheDocument();
    expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Студент")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Присоединиться к группе/i }),
    ).toBeInTheDocument();
    expect(mockedApi.joinGroup).not.toHaveBeenCalled();
  });

  it("offers login for an unauthenticated visitor instead of joining", async () => {
    mockedApi.getMeQuiet.mockResolvedValue(null);

    render(<InvitePage />);

    expect(
      await screen.findByRole("link", { name: /Войти и присоединиться/i }),
    ).toHaveAttribute("href", "/login?invite=test-token-123");
    expect(
      screen.queryByRole("button", { name: /Присоединиться к группе/i }),
    ).not.toBeInTheDocument();
  });

  it("joins the group after explicit confirmation", async () => {
    const user = userEvent.setup();
    mockedApi.joinGroup.mockResolvedValue(
      apiUser({
        id: "user-1",
        group_id: "group-1",
        group_name: "ИУ5-11Б",
        subgroup_number: 2,
      }),
    );

    render(<InvitePage />);

    await user.click(
      await screen.findByRole("button", { name: /Присоединиться к группе/i }),
    );

    expect(
      await screen.findByText(/Вы успешно вступили в группу!/i),
    ).toBeInTheDocument();
    expect(mockedApi.joinGroup).toHaveBeenCalledWith("test-token-123");
  });

  it("reports that the user already belongs to this group", async () => {
    mockedApi.getMeQuiet.mockResolvedValue(
      apiUser({ id: "user-1", group_id: "group-1" }),
    );

    render(<InvitePage />);

    expect(
      await screen.findByText("Вы уже состоите в этой группе."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Присоединиться к группе/i }),
    ).not.toBeInTheDocument();
  });

  it("explains that another group must be left first", async () => {
    mockedApi.getMeQuiet.mockResolvedValue(
      apiUser({ id: "user-1", group_id: "group-2" }),
    );

    render(<InvitePage />);

    expect(
      await screen.findByText(/Вы уже состоите в другой группе/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Перейти в настройки" }),
    ).toHaveAttribute("href", "/settings");
    expect(
      screen.queryByRole("button", { name: /Присоединиться к группе/i }),
    ).not.toBeInTheDocument();
  });

  it("displays a clear error when the invite is revoked", async () => {
    mockedApi.getInvitePreview.mockRejectedValue(
      new Error("Ссылка-приглашение недействительна или отозвана"),
    );

    render(<InvitePage />);

    expect(
      await screen.findByText("Ссылка-приглашение недействительна или отозвана"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("keeps the preview and shows an error when joining fails", async () => {
    const user = userEvent.setup();
    mockedApi.joinGroup.mockRejectedValue(
      new Error("Вы уже состоите в другой группе. Сначала покиньте текущую группу."),
    );

    render(<InvitePage />);

    await user.click(
      await screen.findByRole("button", { name: /Присоединиться к группе/i }),
    );

    expect(
      await screen.findByText(/Вы уже состоите в другой группе/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ИУ5-11Б" })).toBeInTheDocument();
  });
});
