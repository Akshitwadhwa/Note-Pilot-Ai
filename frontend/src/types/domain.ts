export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY"
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export type User = {
  id: string;
  email: string;
  name?: string | null;
};

export type TimetableEntry = {
  id: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectName: string;
};

export type Note = {
  id: string;
  userId: string;
  timetableId: string;
  content: string;
  summary?: string | null;
  timestamp: string;
};
