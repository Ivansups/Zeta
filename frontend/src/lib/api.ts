/**
 * Client API layer for Zeta frontend.
 * Interacts with backend through Next.js proxy route `/api/*`.
 */


export type ApiUser = {
  id: string;
  telegram_id: number;
  role: "admin" | "elder" | "helper" | "curator" | "student" | "guest";
  display_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  group_id?: string | null;
  group_name?: string | null;
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

export type ApiHomeworkInput = {
  title: string;
  description: string;
  subject?: string;
  deadline: string;
  subgroup?: number | null;
  group_id?: string;
  schedule_pair_id?: string;
};

export type ApiHomeworkPreview = {
  subject: string;
  description: string;
  deadline: string | null;
  subgroup: number | null;
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

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch("/api/auth/refresh", { method: "POST" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/**
 * Fetch with a single transparent token refresh on 401.
 * When the refresh token is gone the user is sent back to the login page.
 */
async function request(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status !== 401) {
    return response;
  }

  if (!(await refreshSession())) {
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      // Full reload after the session is gone: it drops stale client caches.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    return response;
  }

  return fetch(url, init);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      (errorData as { detail?: string }).detail || `Request failed with status ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const api = {
  async getMe(): Promise<ApiUser | null> {
    try {
      const res = await request("/api/auth/me", { method: "GET" });
      if (res.status === 401) {
        return null;
      }
      return await handleResponse<ApiUser>(res);
    } catch {
      return null;
    }
  },

  async createGroup(data: { name: string; faculty?: string; university?: string }): Promise<ApiGroup> {
    const res = await request("/api/auth/groups", jsonInit("POST", data));
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

    const res = await request(`/api/schedule/day?${query.toString()}`, { method: "GET" });
    return handleResponse<ApiSchedulePair[]>(res);
  },

  async getWeekSchedule(params: {
    group_name?: string;
    group_id?: string;
    subgroup?: number;
    parity?: string;
  }): Promise<ApiSchedulePair[]> {
    const query = new URLSearchParams();
    if (params.group_name) query.set("group_name", params.group_name);
    if (params.group_id) query.set("group_id", params.group_id);
    if (params.subgroup) query.set("subgroup", String(params.subgroup));
    if (params.parity) query.set("parity", params.parity);

    const res = await request(`/api/schedule/week?${query.toString()}`, { method: "GET" });
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
    const res = await request(`/api/homework${qs ? `?${qs}` : ""}`, { method: "GET" });
    return handleResponse<ApiHomework[]>(res);
  },

  async createHomework(data: ApiHomeworkInput): Promise<ApiHomework> {
    const res = await request("/api/homework", jsonInit("POST", data));
    return handleResponse<ApiHomework>(res);
  },

  async updateHomework(
    homeworkId: string,
    data: Partial<ApiHomeworkInput>,
  ): Promise<ApiHomework> {
    const res = await request(
      `/api/homework/${homeworkId}`,
      jsonInit("PATCH", data),
    );
    return handleResponse<ApiHomework>(res);
  },

  async deleteHomework(homeworkId: string): Promise<void> {
    const res = await request(`/api/homework/${homeworkId}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(`Failed to delete homework: ${res.status}`);
    }
  },

  async parseHomework(text: string): Promise<ApiHomeworkPreview> {
    const res = await request("/api/homework/parse", jsonInit("POST", { text }));
    return handleResponse<ApiHomeworkPreview>(res);
  },

  async createStudentInvite(subgroupNumber?: number): Promise<ApiInvite> {
    const res = await request(
      "/api/auth/invites/student",
      jsonInit("POST", { subgroup_number: subgroupNumber || null }),
    );
    return handleResponse<ApiInvite>(res);
  },

  async listInvites(): Promise<ApiInvite[]> {
    const res = await request("/api/auth/invites", { method: "GET" });
    return handleResponse<ApiInvite[]>(res);
  },

  async revokeInvite(inviteId: string): Promise<void> {
    const res = await request(`/api/auth/invites/${inviteId}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(`Failed to revoke invite: ${res.status}`);
    }
  },

  async listUsers(): Promise<ApiUser[]> {
    const res = await request("/api/auth/users", { method: "GET" });
    return handleResponse<ApiUser[]>(res);
  },

  async setUserRole(userId: string, role: "elder" | "student"): Promise<ApiUser> {
    const res = await request(
      `/api/auth/users/${userId}/role`,
      jsonInit("PATCH", { role }),
    );
    return handleResponse<ApiUser>(res);
  },
};
