import type { ApiUser } from "./api";
import { canManageHomework } from "./permissions";

function user(role: ApiUser["role"]): ApiUser {
  return {
    id: "user-1",
    telegram_id: 1,
    role,
    group_id: "group-1",
    subgroup_number: 1,
  };
}

describe("canManageHomework", () => {
  it.each(["admin", "elder", "helper"] as const)("allows %s", (role) => {
    expect(canManageHomework(user(role))).toBe(true);
  });

  it.each(["student", "curator", "guest"] as const)("denies %s", (role) => {
    expect(canManageHomework(user(role))).toBe(false);
  });

  it("denies anonymous visitors", () => {
    expect(canManageHomework(null)).toBe(false);
  });
});
