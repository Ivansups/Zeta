import { User } from "../types";

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;
let inMemoryUser: User | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    return inMemoryAccessToken;
  },
  getRefreshToken(): string | null {
    return inMemoryRefreshToken;
  },
  setTokens(accessToken: string, refreshToken: string): void {
    inMemoryAccessToken = accessToken;
    inMemoryRefreshToken = refreshToken;
  },
  clearTokens(): void {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    inMemoryUser = null;
  },
  getCachedUser(): User | null {
    return inMemoryUser;
  },
  setCachedUser(user: User | null): void {
    inMemoryUser = user;
  },
};
