import { DayOfWeek, HomeworkItem, SchedulePair, Subgroup, User } from "../types";
import { MOCK_HOMEWORKS, MOCK_SCHEDULE, MOCK_USERS } from "./mockData";
import { tokenStorage } from "./storage";

export const api = {
  async loginWithTelegram(telegramIdOrKey: string): Promise<User> {
    const user =
      MOCK_USERS[telegramIdOrKey] ||
      Object.values(MOCK_USERS).find((u) => u.telegramId === telegramIdOrKey) ||
      MOCK_USERS.student_1;

    const fakeAccessToken = `access_token_${user.id}_${Date.now()}`;
    const fakeRefreshToken = `refresh_token_${user.id}_${Date.now()}`;

    tokenStorage.setTokens(fakeAccessToken, fakeRefreshToken);
    tokenStorage.setCachedUser(user);

    return user;
  },

  async logout(): Promise<void> {
    tokenStorage.clearTokens();
  },

  async getCurrentUser(): Promise<User | null> {
    return tokenStorage.getCachedUser();
  },

  async getSchedule(day: DayOfWeek, subgroup: Subgroup): Promise<SchedulePair[]> {
    return MOCK_SCHEDULE.filter((pair) => {
      if (pair.day !== day) {
        return false;
      }
      return pair.subgroup === undefined || pair.subgroup === subgroup;
    });
  },

  async getHomeworks(subgroup?: Subgroup): Promise<HomeworkItem[]> {
    return MOCK_HOMEWORKS.filter((hw) => {
      if (subgroup === undefined) {
        return true;
      }
      return hw.subgroup === undefined || hw.subgroup === subgroup;
    });
  },

  async getDaysWithHomework(subgroup?: Subgroup): Promise<DayOfWeek[]> {
    const list = await this.getHomeworks(subgroup);
    const daySet = new Set<DayOfWeek>(list.map((item) => item.day));
    return Array.from(daySet);
  },
};
