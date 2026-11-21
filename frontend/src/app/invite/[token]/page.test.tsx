import { render, screen, waitFor } from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { apiUser } from "@/lib/test-fixtures";

import InvitePage from "./page";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  api: {
    getMe: jest.fn(),
    joinGroup: jest.fn(),
  },
}));

const mockedParams = useParams as jest.Mock;
const mockedRouter = useRouter as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

describe("InvitePage", () => {
  const push = jest.fn();
  const replace = jest.fn();

  beforeEach(() => {
    mockedParams.mockReturnValue({ token: "test-token-123" });
    mockedRouter.mockReturnValue({ push, replace });
    push.mockClear();
    replace.mockClear();
    jest.clearAllMocks();
  });

  it("redirects unauthenticated user to login with invite query parameter", async () => {
    mockedApi.getMe.mockResolvedValue(null);

    render(<InvitePage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login?invite=test-token-123");
    });
  });

  it("joins group for authenticated user and redirects to home", async () => {
    mockedApi.getMe.mockResolvedValue(apiUser({ id: "user-1", group_id: null }));
    mockedApi.joinGroup.mockResolvedValue(
      apiUser({
        id: "user-1",
        group_id: "group-1",
        group_name: "IU5-11B",
        subgroup_number: 2,
      }),
    );

    render(<InvitePage />);

    expect(
      await screen.findByText(/Вы успешно вступили в группу!/i),
    ).toBeInTheDocument();
    expect(mockedApi.joinGroup).toHaveBeenCalledWith("test-token-123");
  });

  it("displays error message when joining fails", async () => {
    mockedApi.getMe.mockResolvedValue(apiUser({ id: "user-1", group_id: null }));
    mockedApi.joinGroup.mockRejectedValue(new Error("Invite link is invalid"));

    render(<InvitePage />);

    expect(
      await screen.findByText(/Invite link is invalid/i),
    ).toBeInTheDocument();
  });
});
