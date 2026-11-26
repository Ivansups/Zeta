import { api } from "../api";
import { tokenStorage } from "../storage";
import { getApiBaseUrl } from "../../config";

// Mock expo-secure-store
const mockStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, val: string) => {
    mockStore.set(key, val);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
  isAvailableAsync: jest.fn(async () => true),
}));

describe("tokenStorage", () => {
  beforeEach(async () => {
    mockStore.clear();
    await tokenStorage.clearTokens();
  });

  it("stores and retrieves access token asynchronously", async () => {
    await tokenStorage.setTokens("test-access-token", "test-refresh-token");
    const token = await tokenStorage.getAccessToken();
    expect(token).toBe("test-access-token");
  });

  it("clears tokens and cached user", async () => {
    await tokenStorage.setTokens("token-123");
    await tokenStorage.setCachedUser({
      id: "u1",
      telegramId: "12345",
      firstName: "Test",
      role: "student",
      groupId: "g1",
      groupName: "ИУ5-11Б",
      subgroup: 1,
    });

    await tokenStorage.clearTokens();
    expect(await tokenStorage.getAccessToken()).toBeNull();
    expect(await tokenStorage.getCachedUser()).toBeNull();
  });
});

describe("api client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    mockStore.clear();
    await tokenStorage.clearTokens();
    jest.clearAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends Authorization header when token is present", async () => {
    await tokenStorage.setTokens("secret-jwt-token");

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "usr-1",
        telegram_id: 99999,
        role: "student",
        group_id: "grp-1",
        group_name: "ИУ5-11Б",
        subgroup_number: 1,
        display_name: "Алексей Студент",
        created_at: "2026-11-20T10:00:00Z",
      }),
    } as unknown as Response);

    const user = await api.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.firstName).toBe("Алексей");
    expect(user?.groupName).toBe("ИУ5-11Б");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${getApiBaseUrl()}/auth/me`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-jwt-token",
        }),
      })
    );
  });

  it("intercepts 401 and clears tokens", async () => {
    await tokenStorage.setTokens("expired-jwt-token");

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Token expired" }),
    } as unknown as Response);

    await expect(api.getCurrentUser()).rejects.toThrow("Token expired");
    expect(await tokenStorage.getAccessToken()).toBeNull();
  });

  it("fetches schedule for a given day and subgroup", async () => {
    await tokenStorage.setTokens("valid-token");

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: "p-1",
          group_id: "g-1",
          group_name: "ИУ5-11Б",
          subgroup: 1,
          day_of_week: "Понедельник",
          pair_number: 1,
          start_time: "08:30",
          end_time: "10:05",
          week_parity: "both",
          subject: "Математический анализ",
          room: "305",
        },
      ],
    } as unknown as Response);

    const pairs = await api.getSchedule("monday", 1);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].subject).toBe("Математический анализ");
    expect(pairs[0].classroom).toBe("305");
  });

  it("fetches homeworks with subgroup filtering", async () => {
    await tokenStorage.setTokens("valid-token");

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: "hw-1",
          group_id: "g-1",
          title: "Ряды Тейлора",
          description: "Номер 14",
          subject: "Математический анализ",
          deadline: "2026-11-23T23:59:00Z",
          subgroup: 1,
        },
      ],
    } as unknown as Response);

    const hw = await api.getHomeworks(1);
    expect(hw).toHaveLength(1);
    expect(hw[0].title).toBe("Ряды Тейлора");
    expect(hw[0].day).toBe("monday");
  });
});
