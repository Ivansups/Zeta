/**
 * Client API layer for Zeta frontend.
 * Interacts with backend through Next.js proxy route `/api/*`.
 */

import type { Lesson, Student, Subgroup } from "./types";

export type ApiUser = {
  id: string;
  telegram_id: number;
  role: "admin" | "elder" | "helper" | "curator" | "student" | "guest";
  display_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  group_id?: string | null;
  subgroup_number?: number | null;
};

export type ApiGroup = {
  id: string;
  name: string;
  faculty?: string | null;
  university?: string | null;
  created_at: string;
};

export type ApiSchedulePair = {
  id: string;
  group_id: string;
  group_name?: string | null;
  subgroup?: number | null;
  day_of_week: string;
  pair_number: number;
  start_time: string;
  end_time: string;
  week_parity?: string | null;
  subject: string;
  subject_id?: string | null;
  teacher?: string | null;
  teacher_title?: string | null;
  room?: string | null;
  is_online: boolean;
  lesson_type?: string | null;
  notes: string[];
};

export type ApiHomework = {
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
};

export type ApiInvite = {
  id: string;
  role: string;
  group_id?: string | null;
  subgroup_number?: number | null;
  token?: string;
  invite_url: string;
  created_at: string;
  expires_at?: string | null;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      (errorData as { detail?: string }).detail || `Request failed with status ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getMe(): Promise<ApiUser | null> {
    try {
      const res = await fetch("/api/auth/me", { method: "GET" });
      if (res.status === 401) {
        return null;
      }
      return await handleResponse<ApiUser>(res);
    } catch {
      return null;
    }
  },

  async createGroup(data: { name: string; faculty?: string; university?: string }): Promise<ApiGroup> {
    const res = await fetch("/api/auth/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<ApiGroup>(res);
  },

  async getDaySchedule(params: {
    day: string;
    group_name?: string;
    group_id?: string;
    subgroup?: number;
  }): Promise<ApiSchedulePair[]> {
    const query = new URLSearchParams();
    query.set("day", params.day);
    if (params.group_name) query.set("group_name", params.group_name);
    if (params.group_id) query.set("group_id", params.group_id);
    if (params.subgroup) query.set("subgroup", String(params.subgroup));

    const res = await fetch(`/api/schedule/day?${query.toString()}`, { method: "GET" });
    return handleResponse<ApiSchedulePair[]>(res);
  },

  async getWeekSchedule(params: {
    group_name?: string;
    group_id?: string;
    subgroup?: number;
  }): Promise<ApiSchedulePair[]> {
    const query = new URLSearchParams();
    if (params.group_name) query.set("group_name", params.group_name);
    if (params.group_id) query.set("group_id", params.group_id);
    if (params.subgroup) query.set("subgroup", String(params.subgroup));

    const res = await fetch(`/api/schedule/week?${query.toString()}`, { method: "GET" });
    return handleResponse<ApiSchedulePair[]>(res);
  },

  async getHomeworks(params?: {
    group_id?: string;
    subgroup?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiHomework[]> {
    const query = new URLSearchParams();
    if (params?.group_id) query.set("group_id", params.group_id);
    if (params?.subgroup) query.set("subgroup", String(params.subgroup));
    if (params?.date_from) query.set("date_from", params.date_from);
    if (params?.date_to) query.set("date_to", params.date_to);

    const qs = query.toString();
    const res = await fetch(`/api/homework${qs ? `?${qs}` : ""}`, { method: "GET" });
    return handleResponse<ApiHomework[]>(res);
  },

  async createHomework(data: {
    title: string;
    description: string;
    subject?: string;
    deadline: string;
    subgroup?: number;
    group_id?: string;
    schedule_pair_id?: string;
  }): Promise<ApiHomework> {
    const res = await fetch("/api/homework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<ApiHomework>(res);
  },

  async createStudentInvite(subgroupNumber?: number): Promise<ApiInvite> {
    const res = await fetch("/api/auth/invites/student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subgroup_number: subgroupNumber || null }),
    });
    return handleResponse<ApiInvite>(res);
  },

  async listInvites(): Promise<ApiInvite[]> {
    const res = await fetch("/api/auth/invites", { method: "GET" });
    return handleResponse<ApiInvite[]>(res);
  },
};
