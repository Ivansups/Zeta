export type Subgroup = 1 | 2;

export type Homework = {
  id: string;
  description: string;
};

export type Lesson = {
  id: string;
  date: string;
  dayLabel: string;
  time: string;
  endTime: string;
  subject: string;
  teacher: string;
  location: string;
  kind: "Лекция" | "Практика" | "Лабораторная";
  subgroup: Subgroup | "all";
  accent: "blue" | "green" | "coral" | "violet";
  homework?: Homework;
};

export type HomeworkDraft = {
  lessonId: string;
  description: string;
};

export type Student = {
  id: string;
  name: string;
  initials: string;
  subgroup: Subgroup;
  role: "Староста" | "Студент";
  color: "blue" | "green" | "coral" | "violet";
};
