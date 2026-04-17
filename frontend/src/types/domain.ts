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

export type Course = {
  id: string;
  userId: string;
  name: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
};

export type CourseDocument = {
  id: string;
  courseId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  extractedText: string;
  syllabusSummary?: string | null;
  credits?: string | null;
  evaluationCriteria?: string | null;
  metadata?: {
    chunkCount?: number;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type CourseNote = Note & {
  timetableEntry: TimetableEntry | null;
};

export type CourseDetail = {
  course: Course;
  timetableEntries: TimetableEntry[];
  notes: CourseNote[];
};

export type CourseQuestionResult = {
  answer: string;
  sources: Array<{
    documentId: string;
    fileName: string;
    chunkIndex: number;
    score: number;
    excerpt: string;
  }>;
};
