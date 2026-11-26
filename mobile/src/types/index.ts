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
  photoUrl?: string;
  createdAt?: string;
}

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

export interface HomeworkItem {
  id: string;
  groupId?: string;
  groupName?: string;
  pairId?: string;
  schedulePairId?: string;
  subject: string;
  title: string;
  description: string;
  deadline: string; // Формат: "18 ноября", "20.11" или ISO
  day: DayOfWeek;
  subgroup?: Subgroup; // undefined = для всей группы
  isCompleted?: boolean;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchedulePair {
  id: string;
  groupId?: string;
  groupName?: string;
  pairNumber: number;
  timeStart: string;
  timeEnd: string;
  subject: string;
  teacher: string;
  classroom: string;
  room?: string;
  day: DayOfWeek;
  dayOfWeek?: string;
  weekParity?: string;
  subgroup?: Subgroup; // undefined = для всей группы
  isOnline?: boolean;
  lessonType?: string;
  notes?: string[];
  homework?: string;
  homeworkItem?: HomeworkItem;
}

export type TabName = "schedule" | "homework" | "profile";

// Backend API schemas
export interface ApiUserResponse {
  id: string;
  telegram_id: number;
  role: string;
  group_id?: string | null;
  group_name?: string | null;
  subgroup_number?: number | null;
  display_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  created_at: string;
}

export interface ApiTokenResponse {
  access_token: string;
  token_type?: string;
  user: ApiUserResponse;
}

export interface ApiSchedulePair {
  id: string;
  group_id: string;
  group_name?: string | null;
  subgroup?: number | null;
  day_of_week: string;
  pair_number: number;
  start_time: string;
  end_time: string;
  week_parity: string;
  subject: string;
  teacher?: string | null;
  teacher_title?: string | null;
  room?: string | null;
  is_online?: boolean;
  lesson_type?: string;
  notes?: string[];
}

export interface ApiHomeworkItem {
  id: string;
  group_id: string;
  group_name?: string | null;
  schedule_pair_id?: string | null;
  subgroup?: number | null;
  title: string;
  description: string;
  subject?: string | null;
  deadline: string;
  created_by_id?: string | null;
  created_at: string;
  updated_at: string;
}
