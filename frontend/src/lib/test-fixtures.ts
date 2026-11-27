import type { ApiHomework, ApiInvite, ApiSchedulePair, ApiUser } from "./api";
import type { Lesson } from "./types";

export const testLessons: Lesson[] = [
  {
    id: "math-2026-10-15",
    date: "2026-10-15",
    dayLabel: "Четверг",
    time: "09:00",
    endTime: "10:30",
    subject: "Математический анализ",
    teacher: "Мария Волкова",
    location: "ауд. 312",
    kind: "Лекция",
    subgroup: "all",
    accent: "blue",
    homework: {
      id: "hw-math",
      description: "Исследовать ряды на сходимость",
      dueDate: "2026-10-15",
      subgroup: "all",
    },
  },
  {
    id: "python-2026-10-15",
    date: "2026-10-15",
    dayLabel: "Четверг",
    time: "10:45",
    endTime: "12:15",
    subject: "Программирование на Python",
    teacher: "Алексей Савин",
    location: "ауд. 405",
    kind: "Лабораторная",
    subgroup: 1,
    accent: "green",
  },
  {
    id: "algorithms-2026-10-15",
    date: "2026-10-16",
    dayLabel: "Пятница",
    time: "12:45",
    endTime: "14:15",
    subject: "Алгоритмы и структуры данных",
    teacher: "Игорь Лебедев",
    location: "ауд. 210",
    kind: "Практика",
    subgroup: 2,
    accent: "coral",
    homework: {
      id: "hw-algorithms",
      description: "Реализовать красно-чёрное дерево",
      dueDate: "2026-10-16",
      subgroup: 2,
    },
  },
  {
    id: "english-2026-10-15",
    date: "2026-10-15",
    dayLabel: "Четверг",
    time: "14:30",
    endTime: "16:00",
    subject: "Английский язык",
    teacher: "Ольга Смит",
    location: "ауд. 118",
    kind: "Практика",
    subgroup: "all",
    accent: "violet",
  },
];

export function apiPair(overrides: Partial<ApiSchedulePair>): ApiSchedulePair {
  return {
    id: "pair-1",
    group_id: "group-1",
    group_name: "ПИ-221",
    subgroup: null,
    day_of_week: "Четверг",
    pair_number: 1,
    start_time: "09:00:00",
    end_time: "10:30:00",
    week_parity: null,
    subject: "Математический анализ",
    subject_id: null,
    teacher: "Мария Волкова",
    teacher_title: null,
    room: "312",
    is_online: false,
    lesson_type: "лек",
    notes: [],
    ...overrides,
  };
}

export function apiHomework(overrides: Partial<ApiHomework>): ApiHomework {
  return {
    id: "hw-1",
    group_id: "group-1",
    group_name: "ПИ-221",
    schedule_pair_id: null,
    subgroup: null,
    title: "Домашнее задание",
    description: "Описание",
    subject: "Математический анализ",
    deadline: "2026-11-21T23:59:00Z",
    is_personal: false,
    status: "approved",
    is_completed: false,
    created_by_id: null,
    created_at: "2026-11-20T10:00:00Z",
    updated_at: "2026-11-20T10:00:00Z",
    ...overrides,
  };
}

export function apiUser(overrides: Partial<ApiUser>): ApiUser {
  return {
    id: "user-1",
    telegram_id: 1001,
    role: "student",
    display_name: "Алина Морозова",
    username: "alina",
    photo_url: null,
    group_id: "group-1",
    subgroup_number: 1,
    ...overrides,
  };
}

export function apiInvite(overrides: Partial<ApiInvite>): ApiInvite {
  return {
    id: "invite-1",
    role: "student",
    group_id: "group-1",
    subgroup_number: 1,
    invite_url: "/invite/token",
    created_at: "2026-11-20T10:00:00Z",
    ...overrides,
  };
}
