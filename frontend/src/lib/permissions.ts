import type { ApiUser } from "./api";

const MANAGER_ROLES: ReadonlySet<ApiUser["role"]> = new Set([
  "admin",
  "elder",
  "helper",
]);

export function canManageHomework(user: ApiUser | null | undefined): boolean {
  return Boolean(user && MANAGER_ROLES.has(user.role));
}
