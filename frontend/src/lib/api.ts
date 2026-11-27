export type ApiSchedulePair = {
  id: string;
  group_id?: string;
  group_name: string;
  day_of_week: string;
  pair_number: number;
  start_time: string;
  end_time: string;
  subject: string;
  subject_id?: string | null;
  lesson_type?: string | null;
  teacher?: string | null;
  teacher_title?: string | null;
  room?: string | null;
  is_online: boolean;
  subgroup?: number | null;
  week_parity?: string | null;
  notes?: string[] | null;
};

export type ApiUser = {
  id: string;
  telegram_id: number;
  role: "admin" | "elder" | "helper" | "curator" | "student" | "guest";
  group_id?: string | null;
  group_name?: string | null;
  subgroup_number?: number | null;
  display_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
};

export type ApiGroup = {
  id: string;
  name: string;
  faculty?: string | null;
  university?: string | null;
  created_at: string;
};

export type ApiHomeworkInput = {
  title?: string;
  description: string;
  deadline: string;
  subject?: string;
  subgroup?: number | null;
  schedule_pair_id?: string | null;
  group_id?: string;
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

export type ApiHomeworkDraft = {
  id: string;
  user_id: string;
  group_id: string;
  title?: string | null;
  subject?: string | null;
  description?: string | null;
  deadline?: string | null;
  subgroup?: number | null;
  expires_at: string;
  raw_text: string;
};

export type ApiHomeworkPreview = {
  subject: string;
  subject_id?: string | null;
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

type RefreshOutcome = "refreshed" | "rejected" | "unavailable";

/** A just-rotated session must not be rotated again by late 401 responses. */
const REFRESH_COOLDOWN_MS = 10_000;

let refreshInFlight: Promise<RefreshOutcome> | null = null;
let lastRefreshAt = 0;

async function refreshSession(): Promise<RefreshOutcome> {
  refreshInFlight ??= fetch("/api/auth/refresh", { method: "POST" })
    .then((response): RefreshOutcome => {
      if (response.ok) {
        lastRefreshAt = Date.now();
        return "refreshed";
      }
      // Only an explicit rejection means the session is unusable.
      if (response.status === 401 || response.status === 403) {
        return "rejected";
      }
      return "unavailable";
    })
    .catch((): RefreshOutcome => "unavailable")
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/**
 * Redirect to the login page, keeping the current screen in `?next=`
 * so the user lands back on it after signing in again.
 */
function redirectToLogin(): void {
  if (typeof window === "undefined") {
    return;
  }

  const { pathname, search } = window.location;
  if (pathname.startsWith("/login")) {
    return;
  }

  const target = `${pathname}${search}`;
  // Full reload after the session is gone: it drops stale client caches.
  window.location.href =
    target === "/" ? "/login" : `/login?next=${encodeURIComponent(target)}`;
}

/**
 * Fetch with a single transparent token refresh on 401.
 * The user is sent back to the login page only when the refresh token is
 * rejected; a failed refresh call itself must not end the session.
 */
async function request(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status !== 401) {
    return response;
  }

  if (Date.now() - lastRefreshAt < REFRESH_COOLDOWN_MS) {
    // The cookies were rotated moments ago, so retry with the fresh token.
    const retried = await fetch(url, init);
    if (retried.status === 401) {
      redirectToLogin();
    }
    return retried;
  }

  const outcome = await refreshSession();
  if (outcome === "unavailable") {
    return response;
  }
  if (outcome === "rejected") {
    redirectToLogin();
    return response;
  }

  const retried = await fetch(url, init);
  if (retried.status === 401) {
    // A fresh token was still rejected: the session is not usable anymore.
    redirectToLogin();
  }
  return retried;
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

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
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

  async leaveGroup(): Promise<ApiUser> {
    const res = await request("/api/auth/groups/leave", jsonInit("POST"));
    return handleResponse<ApiUser>(res);
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

  async joinGroup(inviteToken: string): Promise<ApiUser> {
    const res = await request(
      "/api/auth/invites/join",
      jsonInit("POST", { token: inviteToken }),
    );
    return handleResponse<ApiUser>(res);
  },

  async listUsers(): Promise<ApiUser[]> {
    const res = await request("/api/auth/users", { method: "GET" });
    return handleResponse<ApiUser[]>(res);
  },

  async setUserRole(
    userId: string,
    role: "elder" | "student" | "helper",
  ): Promise<ApiUser> {
    const res = await request(
      `/api/auth/users/${userId}/role`,
      jsonInit("PATCH", { role }),
    );
    return handleResponse<ApiUser>(res);
  },
};
