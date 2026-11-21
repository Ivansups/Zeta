import { apiUser } from "@/lib/test-fixtures";

import { toShellUser } from "./app-shell";

describe("toShellUser", () => {
  it("shows the group name and subgroup from the API user", () => {
    const shellUser = toShellUser(
      apiUser({ role: "elder", group_name: "ФКН-241", subgroup_number: null }),
    );

    expect(shellUser.role).toBe("Староста");
    expect(shellUser.group).toBe("ФКН-241");
  });

  it("falls back to the subgroup when the group name is missing", () => {
    const shellUser = toShellUser(apiUser({ subgroup_number: 2 }));

    expect(shellUser.group).toBe("Подгруппа 2");
  });
});
