import { Platform } from "react-native";

/**
 * Возвращает базовый URL API с учётом переменных окружения и платформы.
 */
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  return "http://localhost:8000";
}

export const API_BASE_URL = getApiBaseUrl();
