import type { Role } from "../types";

const HOMEWORK_EDITOR_ROLES: readonly Role[] = ["elder", "helper"];

/**
 * Homework is edited by the group elder and their helpers.
 * The backend still enforces the same rule.
 */
export function canManageHomework(role: Role): boolean {
  return HOMEWORK_EDITOR_ROLES.includes(role);
}
