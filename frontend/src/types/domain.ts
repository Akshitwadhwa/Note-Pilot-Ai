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

export type TimetableImportCandidate = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectName: string;
};

export type TimetableImportResult = {
  mode: "merge" | "replace";
  extractedCount: number;
  insertedCount: number;
  skippedDuplicateCount: number;
  skippedConflictCount: number;
  removedExistingCount: number;
  finalCount: number;
  inserted: TimetableEntry[];
  skippedDuplicates: TimetableImportCandidate[];
  skippedConflicts: TimetableImportCandidate[];
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
  documentCount?: number;
  latestHandoutName?: string | null;
  handoutNames?: string[];
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
  googleClassroomMaterials: GoogleClassroomMaterial[];
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

export type GoogleClassroomStatus = {
  connected: boolean;
  googleEmail: string | null;
  lastSyncedAt: string | null;
};

export type GoogleClassroomMaterialAttachment = {
  id: string;
  materialId: string;
  userId: string;
  attachmentType: string;
  title?: string | null;
  url?: string | null;
  driveFileId?: string | null;
  mimeType?: string | null;
  thumbnailUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type MaterialAiAnalysis = {
  id: string;
  materialId: string;
  userId: string;
  summary: string;
  keyPoints: string[];
  topicTags: string[];
  sourceText: string;
  createdAt: string;
  updatedAt: string;
};

export type MaterialQuizQuestion = {
  id: string;
  quizId: string;
  materialId: string;
  userId: string;
  position: number;
  type: string;
  question: string;
  options?: string[] | null;
  answer: string;
  explanation?: string | null;
  createdAt: string;
};

export type MaterialQuiz = {
  id: string;
  materialId: string;
  userId: string;
  title: string;
  instructions?: string | null;
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
  questions?: MaterialQuizQuestion[];
};

export type MaterialQuizAttempt = {
  id: string;
  quizId: string;
  materialId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  answers: Array<{
    questionId: string;
    submittedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
  createdAt: string;
};

export type GoogleClassroomMaterial = {
  id: string;
  userId: string;
  externalId: string;
  sourceType: string;
  courseGoogleId?: string | null;
  courseName?: string | null;
  title: string;
  description?: string | null;
  alternateLink?: string | null;
  topicId?: string | null;
  state?: string | null;
  extractedText?: string | null;
  metadata?: Record<string, unknown> | null;
  publishedAt?: string | null;
  sourceUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: GoogleClassroomMaterialAttachment[];
  analysis?: MaterialAiAnalysis | null;
};

export type GoogleClassroomMaterialDetail = GoogleClassroomMaterial & {
  quizzes: MaterialQuiz[];
  attempts: MaterialQuizAttempt[];
};

export type QuizPrepOverviewItem = MaterialQuiz & {
  materialTitle: string;
  courseName?: string | null;
  latestAttempt: MaterialQuizAttempt | null;
  attempts: MaterialQuizAttempt[];
  attemptCount: number;
  bestScore: number | null;
};

export type GoogleClassroomSyncResult = {
  coursesScanned: number;
  materialsScanned: number;
  inserted: number;
  updated: number;
};

export type GoogleClassroomDashboardItem = {
  materialId: string;
  title: string;
  courseName?: string | null;
  description?: string | null;
  alternateLink?: string | null;
  displayAt: string;
  timingLabel: "due" | "posted";
  workType?: string | null;
  itemType: "assignment" | "quiz";
  sourceType: string;
  summary: string;
  support: string;
};

export type GoogleClassroomDashboardSummary = {
  connected: boolean;
  totalUpcomingCount: number;
  assignmentsDueCount: number;
  overdueAssignmentsCount: number;
  quizzesComingCount: number;
  upcomingAssignments: GoogleClassroomDashboardItem[];
  upcomingQuizzes: GoogleClassroomDashboardItem[];
};

export type QuizPrepSource = {
  label: string;
  kind: "handout" | "classroom_material";
  excerpt: string;
};

export type QuizPrepSection = {
  heading: string;
  content: string;
};

export type QuizPrepQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation?: string | null;
};

export type QuizPrepPack = {
  topic: string;
  noteTitle: string;
  noteSections: QuizPrepSection[];
  practiceQuestions: QuizPrepQuestion[];
  sources: QuizPrepSource[];
};

export type MaterialQuizAttemptResult = MaterialQuizAttempt & {
  results: Array<{
    questionId: string;
    submittedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
};
