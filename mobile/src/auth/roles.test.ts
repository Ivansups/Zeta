import { canManageHomework } from "./roles";

describe("canManageHomework", () => {
  it.each(["elder", "helper"] as const)("allows the %s role", (role) => {
    expect(canManageHomework(role)).toBe(true);
  });

  it.each(["student", "curator", "admin"] as const)(
    "forbids the %s role",
    (role) => {
      expect(canManageHomework(role)).toBe(false);
    },
  );
});
