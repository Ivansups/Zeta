import { ApiError } from "./client";
import { createHomework } from "./homework";

const draft = {
  pairId: "pair-1",
  subgroup: 2 as const,
  description: "Решить задачи 12–18",
  date: "2026-11-17",
};

describe("createHomework", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it("posts the draft to the homework API and maps the response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: "hw-1",
        schedule_pair_id: "pair-1",
        subgroup: 2,
        description: "Решить задачи 12–18",
        date: "2026-11-17",
      }),
    });

    const homework = await createHomework("access-token", draft);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/homework",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          schedule_pair_id: "pair-1",
          subgroup: 2,
          description: "Решить задачи 12–18",
          date: "2026-11-17",
        }),
      }),
    );
    expect(homework).toEqual({
      id: "hw-1",
      pairId: "pair-1",
      subgroup: 2,
      description: "Решить задачи 12–18",
      date: "2026-11-17",
    });
  });

  it("throws an API error with the server detail", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ detail: "Описание обязательно" }),
    });

    await expect(createHomework(null, draft)).rejects.toEqual(
      expect.objectContaining({
        message: "Описание обязательно",
        status: 422,
      } satisfies Partial<ApiError>),
    );
  });
});
