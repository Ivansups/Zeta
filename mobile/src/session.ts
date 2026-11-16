import type { Role } from "./types";

const ROLES: readonly Role[] = [
  "admin",
  "curator",
  "elder",
  "helper",
  "student",
];

export type Session = {
  role: Role;
  token: string | null;
};

function toRole(value: string | undefined): Role {
  return ROLES.find((role) => role === value) ?? "student";
}

/**
 * Temporary session bootstrap until mobile Telegram login lands (#m2).
 * Access is still enforced by the API, so the fallback is read-only.
 */
export function getSessionFromEnv(): Session {
  return {
    role: toRole(process.env.EXPO_PUBLIC_ROLE),
    token: process.env.EXPO_PUBLIC_ACCESS_TOKEN ?? null,
  };
}
