import * as SecureStore from "expo-secure-store";
import { User } from "../types";

const ACCESS_TOKEN_KEY = "zeta_access_token";
const REFRESH_TOKEN_KEY = "zeta_refresh_token";
const USER_KEY = "zeta_user_profile";

// In-memory fallback / cache
let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;
let inMemoryUser: User | null = null;

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    if (inMemoryAccessToken !== null) {
      return inMemoryAccessToken;
    }
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (token !== null) {
        inMemoryAccessToken = token;
        return token;
      }
    } catch {
      // SecureStore unavailable or throws in non-native environment
    }
    return inMemoryAccessToken;
  },

  async getRefreshToken(): Promise<string | null> {
    if (inMemoryRefreshToken !== null) {
      return inMemoryRefreshToken;
    }
    try {
      const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (token !== null) {
        inMemoryRefreshToken = token;
        return token;
      }
    } catch {
      // SecureStore unavailable
    }
    return inMemoryRefreshToken;
  },

  async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    inMemoryAccessToken = accessToken;
    if (refreshToken !== undefined) {
      inMemoryRefreshToken = refreshToken;
    }
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch {
      // fallback to memory
    }
  },

  async clearTokens(): Promise<void> {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    inMemoryUser = null;
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // fallback
    }
  },

  async getCachedUser(): Promise<User | null> {
    if (inMemoryUser !== null) {
      return inMemoryUser;
    }
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        inMemoryUser = parsed;
        return parsed;
      }
    } catch {
      // fallback
    }
    return null;
  },

  async setCachedUser(user: User | null): Promise<void> {
    inMemoryUser = user;
    try {
      if (user) {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      } else {
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    } catch {
      // fallback
    }
  },
};
