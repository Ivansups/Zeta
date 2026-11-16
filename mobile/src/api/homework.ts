import type { Homework, HomeworkDraft, Subgroup } from "../types";
import { apiRequest } from "./client";

type HomeworkResponse = {
  id: string;
  schedule_pair_id: string;
  subgroup: number | null;
  description: string;
  date: string;
};

function toSubgroup(value: number | null): Subgroup | null {
  return value === 1 || value === 2 ? value : null;
}

function toHomework(response: HomeworkResponse): Homework {
  return {
    id: response.id,
    pairId: response.schedule_pair_id,
    subgroup: toSubgroup(response.subgroup),
    description: response.description,
    date: response.date,
  };
}

/** Creates a homework assignment for a schedule pair. */
export async function createHomework(
  token: string | null,
  draft: HomeworkDraft,
): Promise<Homework> {
  const response = await apiRequest<HomeworkResponse>("/homework", {
    method: "POST",
    token,
    body: {
      schedule_pair_id: draft.pairId,
      subgroup: draft.subgroup,
      description: draft.description,
      date: draft.date,
    },
  });

  return toHomework(response);
}
