import {
  ApiHomeworkItem,
  ApiSchedulePair,
  ApiTokenResponse,
  ApiUserResponse,
  DayOfWeek,
  HomeworkItem,
  Role,
  SchedulePair,
  Subgroup,
  User,
} from "../types";
import { getApiBaseUrl } from "../config";
import { MOCK_HOMEWORKS, MOCK_SCHEDULE, MOCK_USERS } from "./mockData";
import { tokenStorage } from "./storage";

export const DAY_RU_TO_EN: Record<string, DayOfWeek> = {
  понедельник: "monday",
  вторник: "tuesday",
  среда: "wednesday",
  четверг: "thursday",
  пятница: "friday",
  суббота: "saturday",
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
};

export const DAY_EN_TO_RU: Record<DayOfWeek, string> = {
  monday: "Понедельник",
  tuesday: "Вторник",
  wednesday: "Среда",
  thursday: "Четверг",
  friday: "Пятница",
  saturday: "Суббота",
};

export function mapApiUserToUser(apiUser: ApiUserResponse): User {
  const parts = (apiUser.display_name || "").trim().split(/\s+/);
  const firstName = parts[0] || (apiUser.username ? `@${apiUser.username}` : "Студент");
  const lastName = parts.slice(1).join(" ") || undefined;

  return {
    id: apiUser.id,
    telegramId: String(apiUser.telegram_id),
    username: apiUser.username || undefined,
    firstName,
    lastName,
    role: (apiUser.role as Role) || "student",
    groupId: apiUser.group_id || "",
    groupName: apiUser.group_name || "Без группы",
    subgroup: (apiUser.subgroup_number as Subgroup) || 1,
    photoUrl: apiUser.photo_url || undefined,
    createdAt: apiUser.created_at,
  };
}

export function mapApiSchedulePairToPair(pair: ApiSchedulePair): SchedulePair {
  const dayKey = (pair.day_of_week || "").trim().toLowerCase();
  const day = DAY_RU_TO_EN[dayKey] || "monday";

  return {
    id: pair.id,
    groupId: pair.group_id,
    groupName: pair.group_name || undefined,
    pairNumber: pair.pair_number,
    timeStart: pair.start_time,
    timeEnd: pair.end_time,
    subject: pair.subject,
    teacher: pair.teacher || "",
    classroom: pair.room || "",
    room: pair.room || "",
    day,
    dayOfWeek: pair.day_of_week,
    weekParity: pair.week_parity,
    subgroup: (pair.subgroup as Subgroup) || undefined,
    isOnline: pair.is_online,
    lessonType: pair.lesson_type,
    notes: pair.notes,
  };
}

export function mapApiHomeworkToItem(hw: ApiHomeworkItem): HomeworkItem {
  let day: DayOfWeek = "monday";
  if (hw.deadline) {
    const datePart = hw.deadline.split("T")[0];
    const parts = datePart.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      const dayIdx = utcDate.getUTCDay();
      const map: DayOfWeek[] = ["monday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      day = map[dayIdx] || "monday";
    } else {
      const d = new Date(hw.deadline);
      const dayIdx = d.getDay();
      const map: DayOfWeek[] = ["monday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      day = map[dayIdx] || "monday";
    }
  }

  return {
    id: hw.id,
    groupId: hw.group_id,
    groupName: hw.group_name || undefined,
    pairId: hw.schedule_pair_id || undefined,
    schedulePairId: hw.schedule_pair_id || undefined,
    subject: hw.subject || "Задание",
    title: hw.title,
    description: hw.description,
    deadline: hw.deadline,
    day,
    subgroup: (hw.subgroup as Subgroup) || undefined,
    createdById: hw.created_by_id || undefined,
    createdAt: hw.created_at,
    updatedAt: hw.updated_at,
  };
}

let onUnauthorizedHandler: (() => void) | null = null;

export const api = {
  setUnauthorizedHandler(handler: (() => void) | null): void {
    onUnauthorizedHandler = handler;
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const token = await tokenStorage.getAccessToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      await tokenStorage.clearTokens();
      if (onUnauthorizedHandler) {
        onUnauthorizedHandler();
      }
      const errBody = (await response.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(errBody?.detail || "Сессия истекла. Пожалуйста, выполните вход снова.");
    }

    if (!response.ok) {
      const errBody = (await response.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(errBody?.detail || `Ошибка сервера: ${response.status}`);
    }

    return (await response.json()) as T;
  },

  async loginWithTelegram(telegramIdOrKey: string): Promise<User> {
    try {
      // 1. Попытка запроса через /auth/dev-login на реальный API
      const tokenResponse = await this.request<ApiTokenResponse>("/auth/dev-login", {
        method: "POST",
      });
      await tokenStorage.setTokens(tokenResponse.access_token);
      const user = mapApiUserToUser(tokenResponse.user);
      await tokenStorage.setCachedUser(user);
      return user;
    } catch {
      // 2. Fallback на mock-профили при отсутствии сети / dev-режиме
      const user =
        MOCK_USERS[telegramIdOrKey] ||
        Object.values(MOCK_USERS).find((u) => u.telegramId === telegramIdOrKey) ||
        MOCK_USERS.student_1;

      const fakeAccessToken = `access_token_${user.id}_${Date.now()}`;
      const fakeRefreshToken = `refresh_token_${user.id}_${Date.now()}`;

      await tokenStorage.setTokens(fakeAccessToken, fakeRefreshToken);
      await tokenStorage.setCachedUser(user);

      return user;
    }
  },

  async logout(): Promise<void> {
    try {
      await this.request<{ status: string }>("/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on logout
    } finally {
      await tokenStorage.clearTokens();
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      return tokenStorage.getCachedUser();
    }

    try {
      const apiUser = await this.request<ApiUserResponse>("/auth/me", { method: "GET" });
      const user = mapApiUserToUser(apiUser);
      await tokenStorage.setCachedUser(user);
      return user;
    } catch (err) {
      const msg = (err as Error).message || "";
      if (msg.includes("Сессия истекла") || msg.includes("401") || msg.includes("expired") || msg.includes("Token expired")) {
        throw err;
      }
      return tokenStorage.getCachedUser();
    }
  },

  async getSchedule(day: DayOfWeek, subgroup: Subgroup): Promise<SchedulePair[]> {
    try {
      const dayRu = DAY_EN_TO_RU[day] || "Понедельник";
      const cachedUser = await tokenStorage.getCachedUser();
      const groupParam = cachedUser?.groupId
        ? `group_id=${encodeURIComponent(cachedUser.groupId)}`
        : `group_name=${encodeURIComponent(cachedUser?.groupName || "ИУ5-11Б")}`;

      const pairs = await this.request<ApiSchedulePair[]>(
        `/schedule/day?day=${encodeURIComponent(dayRu)}&subgroup=${subgroup}&${groupParam}`,
        { method: "GET" }
      );
      return pairs.map(mapApiSchedulePairToPair);
    } catch {
      // Fallback на мок при недоступности бэкенда
      return MOCK_SCHEDULE.filter((pair) => {
        if (pair.day !== day) {
          return false;
        }
        return pair.subgroup === undefined || pair.subgroup === subgroup;
      });
    }
  },

  async getHomeworks(subgroup?: Subgroup): Promise<HomeworkItem[]> {
    try {
      const query = subgroup ? `?subgroup=${subgroup}` : "";
      const items = await this.request<ApiHomeworkItem[]>(`/homework${query}`, { method: "GET" });
      return items.map(mapApiHomeworkToItem);
    } catch {
      return MOCK_HOMEWORKS.filter((hw) => {
        if (subgroup === undefined) {
          return true;
        }
        return hw.subgroup === undefined || hw.subgroup === subgroup;
      });
    }
  },

  async getDaysWithHomework(subgroup?: Subgroup): Promise<DayOfWeek[]> {
    const list = await this.getHomeworks(subgroup);
    const daySet = new Set<DayOfWeek>(list.map((item) => item.day));
    return Array.from(daySet);
  },
};
