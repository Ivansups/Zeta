import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";

import { OnboardingCard, extractInviteToken } from "./onboarding-card";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  api: {
    createGroup: jest.fn(),
  },
}));

const mockedRouter = useRouter as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

describe("extractInviteToken", () => {
  it("accepts a raw token, a relative link and a full URL", () => {
    expect(extractInviteToken("abc123")).toBe("abc123");
    expect(extractInviteToken("/invite/abc123")).toBe("abc123");
    expect(extractInviteToken("https://zeta.example/invite/abc123")).toBe(
      "abc123",
    );
    expect(extractInviteToken("  ")).toBe("");
  });
});

describe("OnboardingCard", () => {
  const push = jest.fn();

  beforeEach(() => {
    mockedRouter.mockReturnValue({ push });
    push.mockClear();
    jest.clearAllMocks();
  });

  it("shows both onboarding scenarios", () => {
    render(<OnboardingCard />);

    expect(
      screen.getByRole("heading", { name: "Настройте учебную группу" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Вступить по коду старосты" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Я староста" }),
    ).toBeInTheDocument();
  });

  it("opens the invite preview for a pasted link", async () => {
    const user = userEvent.setup();
    render(<OnboardingCard />);

    await user.type(
      screen.getByLabelText("Код или ссылка-приглашение"),
      "https://zeta.example/invite/abc123",
    );
    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    expect(push).toHaveBeenCalledWith("/invite/abc123");
  });

  it("asks for a token when the invite field is empty", async () => {
    const user = userEvent.setup();
    render(<OnboardingCard />);

    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    expect(
      screen.getByText("Введите код или ссылку-приглашение от старосты."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("validates the group name before creating it", async () => {
    const user = userEvent.setup();
    render(<OnboardingCard />);

    await user.type(screen.getByLabelText("Название группы"), "A");
    await user.click(screen.getByRole("button", { name: "Создать группу" }));

    expect(
      screen.getByText("Название группы должно быть не короче 2 символов."),
    ).toBeInTheDocument();
    expect(mockedApi.createGroup).not.toHaveBeenCalled();
  });

  it("creates a group and reports backend errors inline", async () => {
    const user = userEvent.setup();
    mockedApi.createGroup.mockRejectedValue(
      new Error("Пользователь уже состоит в группе. Сначала покиньте текущую группу."),
    );
    render(<OnboardingCard />);

    await user.type(screen.getByLabelText("Название группы"), "ИУ5-11Б");
    await user.click(screen.getByRole("button", { name: "Создать группу" }));

    expect(mockedApi.createGroup).toHaveBeenCalledWith({ name: "ИУ5-11Б" });
    expect(
      await screen.findByText(/Пользователь уже состоит в группе/i),
    ).toBeInTheDocument();
  });
});
