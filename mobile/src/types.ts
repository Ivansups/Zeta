export type Role = "admin" | "curator" | "elder" | "helper" | "student";

export type Subgroup = 1 | 2;

export type Homework = {
  id: string;
  pairId: string;
  subgroup: Subgroup | null;
  description: string;
  date: string;
};

export type HomeworkDraft = {
  pairId: string;
  subgroup: Subgroup | null;
  description: string;
  date: string;
};

export type SchedulePair = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  subgroup: Subgroup | null;
  homeworks: Homework[];
};
