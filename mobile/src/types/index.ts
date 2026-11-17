export type Role = "student" | "elder" | "helper" | "curator" | "admin";

export type Subgroup = 1 | 2;

export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  role: Role;
  groupId: string;
  groupName: string;
  subgroup: Subgroup;
}

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

export interface SchedulePair {
  id: string;
  pairNumber: number;
  timeStart: string;
  timeEnd: string;
  subject: string;
  teacher: string;
  classroom: string;
  day: DayOfWeek;
  subgroup?: Subgroup; // undefined = для всей группы
  homework?: string;
}

export type TabName = "schedule" | "homework" | "profile";
