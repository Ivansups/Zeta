import { apiUser } from "@/lib/test-fixtures";

import { toShellUser } from "./app-shell";

describe("toShellUser", () => {
  it("shows the group and role in the profile badge", () => {
    const shellUser = toShellUser(
      apiUser({ role: "elder", group_name: "ФКН-241", subgroup_number: null }),
    );

    expect(shellUser.role).toBe("Староста");
    expect(shellUser.group).toBe("ФКН-241");
    expect(shellUser.badge).toBe("ФКН-241 · Староста");
  });

  it("prefers the subgroup over the student role in the badge", () => {
    const shellUser = toShellUser(
      apiUser({ role: "student", group_name: "ИУ5-11Б", subgroup_number: 1 }),
    );

    expect(shellUser.group).toBe("ИУ5-11Б");
    expect(shellUser.badge).toBe("ИУ5-11Б · Подгруппа 1");
  });

  it("falls back to the subgroup when the group name is missing", () => {
    const shellUser = toShellUser(apiUser({ subgroup_number: 2 }));

    expect(shellUser.group).toBe("Подгруппа 2");
    expect(shellUser.badge).toBe("Подгруппа 2");
  });
});
