import OpenAI from "openai";
import { and, desc, eq, inArray } from "drizzle-orm";
import { google } from "googleapis";

import { env } from "../config/env";
import { db } from "../lib/db";
import {
  googleClassroomConnections,
  googleClassroomMaterialAttachments,
  googleClassroomMaterials,
  materialAiAnalyses,
  materialQuizAttempts,
  materialQuizQuestions,
  materialQuizzes
} from "../lib/drizzle/schema";
import { AppError } from "../middleware/error.middleware";
import { ensureCourse } from "./courses.service";
import { buildQuizPrepPack } from "./course-rag.service";

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

const GOOGLE_CLASSROOM_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
  "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/drive.readonly"
];

type OAuthStatePayload = {
  userId: string;
  ts: number;
};

type SyncResult = {
  coursesScanned: number;
  materialsScanned: number;
  inserted: number;
  updated: number;
};

type NormalizedAttachment = {
  attachmentType: string;
  title: string | null;
  url: string | null;
  driveFileId: string | null;
  mimeType: string | null;
  thumbnailUrl: string | null;
  metadata: Record<string, unknown> | null;
};

type UpsertMaterialInput = {
  userId: string;
  externalId: string;
  sourceType: string;
  courseGoogleId: string | null;
  courseName: string;
  title: string;
  description: string | null;
  alternateLink: string | null;
  topicId: string | null;
  state: string | null;
  extractedText: string | null;
  metadata: Record<string, unknown> | null;
  publishedAt: Date | null;
  sourceUpdatedAt: Date | null;
  attachments: NormalizedAttachment[];
};

type QuizAnswerInput = {
  questionId: string;
  answer: string;
};

type GoogleApiErrorLike = {
  code?: number;
  status?: number;
  cause?: {
    code?: number;
    status?: string;
    message?: string;
  };
};

type DriveClient = ReturnType<typeof google.drive>;
type MaterialRow = typeof googleClassroomMaterials.$inferSelect;
type MaterialWithHydration = Awaited<ReturnType<typeof hydrateMaterials>>[number];

type DashboardItem = {
  materialId: string;
  title: string;
  courseName: string | null;
  description: string | null;
  alternateLink: string | null;
  displayAt: string;
  timingLabel: "due" | "posted";
  workType: string | null;
  itemType: "assignment" | "quiz";
  sourceType: string;
  summary: string;
  support: string;
};

const GOOGLE_DRIVE_EXPORTS: Record<string, { exportMimeType: string; parser: "text" | "pdf" }> = {
  "application/vnd.google-apps.document": {
    exportMimeType: "text/plain",
    parser: "text"
  },
  "application/vnd.google-apps.spreadsheet": {
    exportMimeType: "text/csv",
    parser: "text"
  },
  "application/vnd.google-apps.presentation": {
    exportMimeType: "text/plain",
    parser: "text"
  }
};

const ASSIGNMENT_LOOKAHEAD_DAYS = 7;
const QUIZ_LOOKAHEAD_DAYS = 14;
const QUIZ_POST_LOOKBACK_DAYS = 21;
const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};
const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

function assertGoogleConfig() {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri) {
    throw new AppError(
      "Google Classroom is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.",
      500
    );
  }
}

function ensureOpenAI() {
  if (!openai) {
    throw new AppError("OPENAI_API_KEY is not configured", 500);
  }

  return openai;
}

function createOAuthClient() {
  assertGoogleConfig();
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
}

function encodeState(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeState(state: string): OAuthStatePayload {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as OAuthStatePayload;
    if (!parsed?.userId || typeof parsed.userId !== "string") {
      throw new Error("Invalid state payload");
    }
    return parsed;
  } catch {
    throw new AppError("Invalid Google OAuth state", 400);
  }
}

function normalizeGoogleDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function buildFrontendRedirectUrl(status: "connected" | "error", message?: string) {
  const fallback = "http://localhost:5173/materials";

  try {
    const url = new URL(env.frontendBaseUrl || fallback);
    if (url.pathname === "/") {
      url.pathname = "/materials";
    }
    url.searchParams.set("googleClassroom", status);
    if (message) {
      url.searchParams.set("message", message);
    }
    return url.toString();
  } catch {
    const url = new URL(fallback);
    url.searchParams.set("googleClassroom", status);
    if (message) {
      url.searchParams.set("message", message);
    }
    return url.toString();
  }
}

function extractJsonPayload(raw: string) {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fencedMatch?.[1]?.trim() ?? trimmed;
}

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function parsePdfBuffer(buffer: Buffer) {
  try {
    const pdfParseModule = require("pdf-parse") as (input: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParseModule(buffer);
    return normalizeExtractedText(parsed.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF parser error";
    console.warn(`[google-classroom] Failed to parse PDF attachment: ${message}`);
    return "";
  }
}

function formatSourceText(input: {
  courseName: string | null;
  title: string;
  description: string | null;
  extractedText: string | null;
  sourceType: string;
  attachments: NormalizedAttachment[];
}) {
  const lines = [
    `Course: ${input.courseName ?? "Unknown"}`,
    `Source Type: ${input.sourceType}`,
    `Title: ${input.title}`
  ];

  if (input.description) {
    lines.push(`Description: ${input.description}`);
  }

  if (input.extractedText) {
    lines.push(`Extracted Text: ${input.extractedText}`);
  }

  if (input.attachments.length > 0) {
    lines.push(
      `Attachments: ${input.attachments
        .map((attachment) => {
          const parts = [attachment.attachmentType];
          if (attachment.title) parts.push(attachment.title);
          if (attachment.url) parts.push(attachment.url);
          return parts.join(" | ");
        })
        .join("\n")}`
    );
  }

  return lines.join("\n\n").trim();
}

function clampQuestionCount(value: number) {
  if (!Number.isFinite(value)) return 5;
  return Math.min(10, Math.max(3, Math.round(value)));
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

function getMaterialMetadata(material: MaterialRow | MaterialWithHydration) {
  return material.metadata && typeof material.metadata === "object"
    ? (material.metadata as Record<string, unknown>)
    : {};
}

function getDueAt(material: MaterialRow | MaterialWithHydration) {
  const metadata = getMaterialMetadata(material);
  const dueDate =
    metadata.dueDate && typeof metadata.dueDate === "object"
      ? (metadata.dueDate as Record<string, unknown>)
      : null;
  const dueTime =
    metadata.dueTime && typeof metadata.dueTime === "object"
      ? (metadata.dueTime as Record<string, unknown>)
      : null;

  const year = Number(dueDate?.year);
  const month = Number(dueDate?.month);
  const day = Number(dueDate?.day);
  if (!year || !month || !day) {
    return null;
  }

  const hours = Number(dueTime?.hours ?? 23);
  const minutes = Number(dueTime?.minutes ?? 59);
  const seconds = Number(dueTime?.seconds ?? 0);

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMaterialWorkType(material: MaterialRow | MaterialWithHydration) {
  const metadata = getMaterialMetadata(material);
  return typeof metadata.workType === "string" ? metadata.workType : null;
}

function getMaterialReferenceDate(material: MaterialRow | MaterialWithHydration) {
  return material.publishedAt ?? material.sourceUpdatedAt ?? material.createdAt;
}

function isQuizLikeMaterial(material: MaterialRow | MaterialWithHydration) {
  const workType = getMaterialWorkType(material);
  if (workType === "MULTIPLE_CHOICE_QUESTION" || workType === "SHORT_ANSWER_QUESTION") {
    return true;
  }

  const haystack = `${material.title} ${material.description ?? ""}`.toLowerCase();
  return /\bquiz\b|\btest\b|\bexam\b|\bmidterm\b|\bassessment\b/.test(haystack);
}

function isAssignmentLikeMaterial(material: MaterialRow | MaterialWithHydration) {
  if (material.sourceType !== "course_work") {
    return false;
  }

  if (isQuizLikeMaterial(material)) {
    return false;
  }

  const workType = getMaterialWorkType(material);
  if (workType === "ASSIGNMENT") {
    return true;
  }

  const haystack = `${material.title} ${material.description ?? ""}`.toLowerCase();
  return /\bassignment\b|\bhomework\b|\bsubmit\b|\bproject\b/.test(haystack) || Boolean(getDueAt(material));
}

function isUpcomingWithin(dueAt: Date, days: number, now: Date) {
  const diff = dueAt.getTime() - now.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function isRecentWithin(date: Date, days: number, now: Date) {
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function normalizeDashboardDedupKey(material: MaterialWithHydration) {
  return `${material.courseName ?? ""}::${material.title.trim().toLowerCase()}`;
}

function normalizeCourseName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 0, 0);
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes(), date.getSeconds(), 0);
}

function parseExplicitMonthDate(text: string, referenceAt: Date) {
  const dayMonthMatch = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/i
  );
  const monthDayMatch = text.match(
    /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
  );

  const day = dayMonthMatch ? Number(dayMonthMatch[1]) : monthDayMatch ? Number(monthDayMatch[2]) : 0;
  const monthToken = dayMonthMatch ? dayMonthMatch[2].toLowerCase() : monthDayMatch ? monthDayMatch[1].toLowerCase() : "";
  const month = monthToken ? MONTH_INDEX[monthToken] : undefined;

  if (!day || month === undefined) {
    return null;
  }

  let candidate = endOfDay(new Date(referenceAt.getFullYear(), month, day));
  if (candidate.getTime() < referenceAt.getTime()) {
    candidate = endOfDay(new Date(referenceAt.getFullYear() + 1, month, day));
  }

  return candidate;
}

function parseWeekdayMention(text: string, referenceAt: Date) {
  const weekdayMatch = text.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (!weekdayMatch) {
    return null;
  }

  const target = WEEKDAY_INDEX[weekdayMatch[1].toLowerCase()];
  if (target === undefined) {
    return null;
  }

  const baseDay = referenceAt.getDay();
  let diff = target - baseDay;
  if (diff < 0) {
    diff += 7;
  }

  return endOfDay(addDays(referenceAt, diff));
}

function inferPostQuizAt(material: MaterialWithHydration) {
  const referenceAt = getMaterialReferenceDate(material);
  if (!referenceAt) {
    return null;
  }

  const text = `${material.title} ${material.description ?? ""}`.toLowerCase();

  if (/\bday after tomorrow\b/.test(text)) {
    return endOfDay(addDays(referenceAt, 2));
  }

  if (/\btomorrow\b/.test(text)) {
    return endOfDay(addDays(referenceAt, 1));
  }

  if (/\btoday\b/.test(text)) {
    return endOfDay(referenceAt);
  }

  if (/\bnext week\b/.test(text)) {
    return endOfDay(addDays(referenceAt, 7));
  }

  const explicitDate = parseExplicitMonthDate(text, referenceAt);
  if (explicitDate) {
    return explicitDate;
  }

  const weekdayDate = parseWeekdayMention(text, referenceAt);
  if (weekdayDate) {
    return weekdayDate;
  }

  return null;
}

function formatDashboardFallbackSummary(material: MaterialWithHydration, itemType: "assignment" | "quiz") {
  if (material.analysis?.summary) {
    return material.analysis.summary;
  }

  if (material.description?.trim()) {
    return material.description.trim();
  }

  if (itemType === "quiz") {
    return `Prepare for ${material.title} using the attached materials and recent class topics.`;
  }

  return `Review the instructions for ${material.title} and prepare the required submission before the deadline.`;
}

function getAnalysisStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim())
    : [];
}

function formatDashboardFallbackSupport(material: MaterialWithHydration, itemType: "assignment" | "quiz") {
  if (itemType === "quiz") {
    const tags = getAnalysisStringArray(material.analysis?.topicTags).slice(0, 4);
    if (tags.length > 0) {
      return `Likely syllabus: ${tags.join(", ")}. Revisit the related class materials and practice short recall questions.`;
    }

    return "Review the class material, note the main concepts, and practice the definitions, examples, and worked problems most closely related to the topic.";
  }

  const keyPoints = getAnalysisStringArray(material.analysis?.keyPoints).slice(0, 3);
  if (keyPoints.length > 0) {
    return `Start with these points: ${keyPoints.join("; ")}. Then break the work into reading, drafting, and final submission.`;
  }

  return "Read the task carefully, identify the deliverable, collect the required notes/resources, then draft the answer before the deadline.";
}

async function generateDashboardInsight(
  material: MaterialWithHydration,
  itemType: "assignment" | "quiz"
) {
  if (!openai) {
    return {
      summary: formatDashboardFallbackSummary(material, itemType),
      support: formatDashboardFallbackSupport(material, itemType)
    };
  }

  const response = await ensureOpenAI().chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          itemType === "assignment"
            ? "You help students understand upcoming assignments. Return JSON with keys summary and support. summary explains what the assignment is about in one concise paragraph. support gives actionable help in 2-3 sentences."
            : "You help students prepare for upcoming quizzes. Return JSON with keys summary and support. summary explains what the quiz appears to cover in one concise paragraph. support gives a likely syllabus and concrete study focus in 2-3 sentences."
      },
      {
        role: "user",
        content: formatSourceText({
          courseName: material.courseName,
          title: material.title,
          description: material.description,
          extractedText: material.analysis?.summary ?? material.extractedText,
          sourceType: material.sourceType,
          attachments: material.attachments.map((attachment) => ({
            attachmentType: attachment.attachmentType,
            title: attachment.title,
            url: attachment.url,
            driveFileId: attachment.driveFileId,
            mimeType: attachment.mimeType,
            thumbnailUrl: attachment.thumbnailUrl,
            metadata:
              attachment.metadata && typeof attachment.metadata === "object"
                ? (attachment.metadata as Record<string, unknown>)
                : null
          }))
        })
      }
    ]
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) {
    return {
      summary: formatDashboardFallbackSummary(material, itemType),
      support: formatDashboardFallbackSupport(material, itemType)
    };
  }

  try {
    const parsed = JSON.parse(extractJsonPayload(raw)) as {
      summary?: unknown;
      support?: unknown;
    };

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : formatDashboardFallbackSummary(material, itemType);
    const support =
      typeof parsed.support === "string" && parsed.support.trim()
        ? parsed.support.trim()
        : formatDashboardFallbackSupport(material, itemType);

    return { summary, support };
  } catch {
    return {
      summary: formatDashboardFallbackSummary(material, itemType),
      support: formatDashboardFallbackSupport(material, itemType)
    };
  }
}

function isGooglePermissionDenied(error: unknown) {
  const candidate = error as GoogleApiErrorLike | undefined;
  return (
    candidate?.code === 403 ||
    candidate?.status === 403 ||
    candidate?.cause?.code === 403 ||
    candidate?.cause?.status === "PERMISSION_DENIED"
  );
}

function isGoogleMissingResource(error: unknown) {
  const candidate = error as GoogleApiErrorLike | undefined;
  return candidate?.code === 404 || candidate?.status === 404 || candidate?.cause?.code === 404;
}

async function safeListClassroomItems<T>(
  load: () => Promise<{ data?: T }>,
  fallback: T,
  context: string
) {
  try {
    const response = await load();
    return response.data ?? fallback;
  } catch (error) {
    if (isGooglePermissionDenied(error)) {
      console.warn(`[google-classroom] Skipping inaccessible resource: ${context}`);
      return fallback;
    }

    throw error;
  }
}

async function safeReadDriveBuffer(
  load: () => Promise<{ data?: unknown }>,
  context: string
): Promise<Buffer | null> {
  try {
    const response = await load();
    const data = response.data;

    if (!data) {
      return null;
    }

    if (Buffer.isBuffer(data)) {
      return data;
    }

    if (data instanceof ArrayBuffer) {
      return Buffer.from(data);
    }

    if (ArrayBuffer.isView(data)) {
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    }

    if (typeof data === "string") {
      return Buffer.from(data);
    }

    return null;
  } catch (error) {
    if (isGooglePermissionDenied(error) || isGoogleMissingResource(error)) {
      console.warn(`[google-classroom] Skipping inaccessible Drive attachment: ${context}`);
      return null;
    }

    const message = error instanceof Error ? error.message : "Unknown Drive read error";
    console.warn(`[google-classroom] Failed to read Drive attachment (${context}): ${message}`);
    return null;
  }
}

async function extractTextFromDriveAttachment(
  drive: DriveClient,
  attachment: NormalizedAttachment
): Promise<string | null> {
  if (attachment.attachmentType !== "drive_file" || !attachment.driveFileId) {
    return null;
  }

  const title = attachment.title ?? "Untitled attachment";
  const mimeType = attachment.mimeType ?? "";
  const exportConfig = GOOGLE_DRIVE_EXPORTS[mimeType];

  let buffer: Buffer | null = null;
  let parser: "text" | "pdf" = "text";

  if (exportConfig) {
    parser = exportConfig.parser;
    buffer = await safeReadDriveBuffer(
      () =>
        drive.files.export(
          {
            fileId: attachment.driveFileId!,
            mimeType: exportConfig.exportMimeType
          },
          { responseType: "arraybuffer" }
        ),
      `${title} (${mimeType})`
    );
  } else if (mimeType === "application/pdf" || mimeType.startsWith("text/")) {
    parser = mimeType === "application/pdf" ? "pdf" : "text";
    buffer = await safeReadDriveBuffer(
      () =>
        drive.files.get(
          {
            fileId: attachment.driveFileId!,
            alt: "media"
          },
          { responseType: "arraybuffer" }
        ),
      `${title} (${mimeType || "binary"})`
    );
  } else {
    return null;
  }

  if (!buffer) {
    return null;
  }

  const extracted =
    parser === "pdf"
      ? await parsePdfBuffer(buffer)
      : normalizeExtractedText(buffer.toString("utf-8"));

  if (!extracted) {
    return null;
  }

  return `Attachment: ${title}\n${extracted}`;
}

async function extractTextFromDriveAttachments(
  drive: DriveClient,
  attachments: NormalizedAttachment[]
): Promise<string | null> {
  const sections: string[] = [];

  for (const attachment of attachments) {
    const extracted = await extractTextFromDriveAttachment(drive, attachment);
    if (extracted) {
      sections.push(extracted);
    }
  }

  if (sections.length === 0) {
    return null;
  }

  return sections.join("\n\n---\n\n");
}

function normalizeAttachments(materials?: Array<any> | null): NormalizedAttachment[] {
  if (!materials?.length) {
    return [];
  }

  const attachments: NormalizedAttachment[] = [];

  for (const material of materials) {
    if (material.driveFile?.driveFile) {
      const driveFile = material.driveFile.driveFile;
      const metadata: Record<string, unknown> | null = material.driveFile.shareMode
        ? { shareMode: material.driveFile.shareMode }
        : null;

      const attachment: NormalizedAttachment = {
        attachmentType: "drive_file",
        title: driveFile.title ?? null,
        url: driveFile.alternateLink ?? null,
        driveFileId: driveFile.id ?? null,
        mimeType: driveFile.mimeType ?? null,
        thumbnailUrl: driveFile.thumbnailUrl ?? null,
        metadata
      };

      attachments.push(attachment);
      continue;
    }

    if (material.link) {
      const attachment: NormalizedAttachment = {
        attachmentType: "link",
        title: material.link.title ?? null,
        url: material.link.url ?? null,
        driveFileId: null,
        mimeType: null,
        thumbnailUrl: material.link.thumbnailUrl ?? null,
        metadata: null
      };

      attachments.push(attachment);
      continue;
    }

    if (material.youtubeVideo) {
      const attachment: NormalizedAttachment = {
        attachmentType: "youtube_video",
        title: material.youtubeVideo.title ?? null,
        url: material.youtubeVideo.alternateLink ?? null,
        driveFileId: null,
        mimeType: null,
        thumbnailUrl: material.youtubeVideo.thumbnailUrl ?? null,
        metadata: null
      };

      attachments.push(attachment);
      continue;
    }

    if (material.form?.formUrl) {
      const attachment: NormalizedAttachment = {
        attachmentType: "form",
        title: material.form.title ?? "Google Form",
        url: material.form.formUrl ?? null,
        driveFileId: null,
        mimeType: null,
        thumbnailUrl: null,
        metadata: null
      };

      attachments.push(attachment);
    }
  }

  return attachments;
}

async function getConnectionByUserId(userId: string) {
  return db.query.googleClassroomConnections.findFirst({
    where: eq(googleClassroomConnections.userId, userId)
  });
}

async function getOwnedMaterial(userId: string, materialId: string) {
  const material = await db.query.googleClassroomMaterials.findFirst({
    where: and(eq(googleClassroomMaterials.id, materialId), eq(googleClassroomMaterials.userId, userId))
  });

  if (!material) {
    throw new AppError("Material not found", 404);
  }

  return material;
}

async function upsertMaterial(input: UpsertMaterialInput) {
  const existing = await db.query.googleClassroomMaterials.findFirst({
    where: and(
      eq(googleClassroomMaterials.userId, input.userId),
      eq(googleClassroomMaterials.externalId, input.externalId)
    )
  });

  const payload = {
    userId: input.userId,
    externalId: input.externalId,
    sourceType: input.sourceType,
    courseGoogleId: input.courseGoogleId,
    courseName: input.courseName,
    title: input.title,
    description: input.description,
    alternateLink: input.alternateLink,
    topicId: input.topicId,
    state: input.state,
    extractedText: input.extractedText,
    metadata: input.metadata,
    publishedAt: input.publishedAt,
    sourceUpdatedAt: input.sourceUpdatedAt,
    updatedAt: new Date()
  };

  let materialId = existing?.id ?? crypto.randomUUID();

  await db.transaction(async (tx) => {
    if (existing) {
      await tx
        .update(googleClassroomMaterials)
        .set(payload)
        .where(eq(googleClassroomMaterials.id, existing.id));
    } else {
      await tx.insert(googleClassroomMaterials).values({
        id: materialId,
        ...payload,
        createdAt: new Date()
      });
    }

    await tx
      .delete(googleClassroomMaterialAttachments)
      .where(eq(googleClassroomMaterialAttachments.materialId, materialId));

    if (input.attachments.length > 0) {
      await tx.insert(googleClassroomMaterialAttachments).values(
        input.attachments.map((attachment) => ({
          id: crypto.randomUUID(),
          materialId,
          userId: input.userId,
          attachmentType: attachment.attachmentType,
          title: attachment.title,
          url: attachment.url,
          driveFileId: attachment.driveFileId,
          mimeType: attachment.mimeType,
          thumbnailUrl: attachment.thumbnailUrl,
          metadata: attachment.metadata,
          createdAt: new Date()
        }))
      );
    }
  });

  return { inserted: !existing, updated: Boolean(existing) };
}

async function hydrateMaterials(userId: string, materialRows: Array<typeof googleClassroomMaterials.$inferSelect>) {
  if (materialRows.length === 0) {
    return [];
  }

  const materialIds = materialRows.map((material) => material.id);

  const [attachments, analyses] = await Promise.all([
    db.query.googleClassroomMaterialAttachments.findMany({
      where: and(
        eq(googleClassroomMaterialAttachments.userId, userId),
        inArray(googleClassroomMaterialAttachments.materialId, materialIds)
      )
    }),
    db.query.materialAiAnalyses.findMany({
      where: and(eq(materialAiAnalyses.userId, userId), inArray(materialAiAnalyses.materialId, materialIds))
    })
  ]);

  const attachmentsByMaterialId = new Map<string, typeof attachments>();
  for (const attachment of attachments) {
    const group = attachmentsByMaterialId.get(attachment.materialId) ?? [];
    group.push(attachment);
    attachmentsByMaterialId.set(attachment.materialId, group);
  }

  const analysisByMaterialId = new Map(analyses.map((analysis) => [analysis.materialId, analysis]));

  return materialRows.map((material) => ({
    ...material,
    attachments: attachmentsByMaterialId.get(material.id) ?? [],
    analysis: analysisByMaterialId.get(material.id) ?? null
  }));
}

function mapQuizWithQuestions(
  quizzes: Array<typeof materialQuizzes.$inferSelect>,
  questions: Array<typeof materialQuizQuestions.$inferSelect>
) {
  const questionsByQuizId = new Map<string, typeof questions>();

  for (const question of questions) {
    const group = questionsByQuizId.get(question.quizId) ?? [];
    group.push(question);
    questionsByQuizId.set(question.quizId, group);
  }

  return quizzes.map((quiz) => ({
    ...quiz,
    questions: (questionsByQuizId.get(quiz.id) ?? []).sort((a, b) => a.position - b.position)
  }));
}

export async function getGoogleClassroomAuthUrl(userId: string) {
  const oauth = createOAuthClient();
  const state = encodeState({ userId, ts: Date.now() });

  const url = oauth.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: GOOGLE_CLASSROOM_SCOPES,
    state
  });

  return { url };
}

export async function completeGoogleClassroomOAuthFromCallback(code: string, state: string) {
  const { userId } = decodeState(state);
  const oauth = createOAuthClient();

  const tokenResponse = await oauth.getToken(code);
  const tokens = tokenResponse.tokens;

  if (!tokens.access_token) {
    throw new AppError("Google did not return an access token", 400);
  }

  oauth.setCredentials(tokens);

  const oauth2Api = google.oauth2({ version: "v2", auth: oauth });
  const userInfoResponse = await oauth2Api.userinfo.get();

  const googleEmail = userInfoResponse.data.email;
  if (!googleEmail) {
    throw new AppError("Unable to retrieve Google account email", 400);
  }

  const existing = await getConnectionByUserId(userId);

  const updatePayload = {
    googleUserId: userInfoResponse.data.id ?? null,
    googleEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
    scope: tokens.scope ?? existing?.scope ?? null,
    tokenExpiryAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    updatedAt: new Date()
  };

  if (existing) {
    await db
      .update(googleClassroomConnections)
      .set(updatePayload)
      .where(eq(googleClassroomConnections.id, existing.id));
  } else {
    await db.insert(googleClassroomConnections).values({
      id: crypto.randomUUID(),
      userId,
      ...updatePayload,
      createdAt: new Date()
    });
  }

  return {
    redirectUrl: buildFrontendRedirectUrl("connected")
  };
}

export async function getGoogleClassroomStatus(userId: string) {
  const connection = await getConnectionByUserId(userId);

  if (!connection) {
    return {
      connected: false,
      googleEmail: null,
      lastSyncedAt: null
    };
  }

  return {
    connected: true,
    googleEmail: connection.googleEmail,
    lastSyncedAt: connection.lastSyncedAt
  };
}

export async function syncGoogleClassroom(userId: string): Promise<SyncResult> {
  const connection = await getConnectionByUserId(userId);
  if (!connection) {
    throw new AppError("Google Classroom is not connected", 404);
  }

  const oauth = createOAuthClient();
  oauth.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken ?? undefined,
    expiry_date: connection.tokenExpiryAt ? connection.tokenExpiryAt.getTime() : undefined
  });

  const classroom = google.classroom({ version: "v1", auth: oauth });
  const drive = google.drive({ version: "v3", auth: oauth });

  const coursesResponse = await classroom.courses.list({
    courseStates: ["ACTIVE"],
    pageSize: 50
  });

  const courses = coursesResponse.data.courses ?? [];
  let materialsScanned = 0;
  let inserted = 0;
  let updated = 0;

  for (const course of courses) {
    const courseGoogleId = course.id ?? null;
    const courseName = course.name ?? "Untitled course";
    if (!courseGoogleId) {
      continue;
    }

    if (courseName.trim()) {
      await ensureCourse(userId, courseName);
    }

    const announcementsData = await safeListClassroomItems(
      () =>
        classroom.courses.announcements.list({
          courseId: courseGoogleId,
          pageSize: 20
        }),
      { announcements: [] as Array<any> },
      `announcements for course ${courseGoogleId}`
    );

    for (const announcement of announcementsData.announcements ?? []) {
      materialsScanned += 1;
      const attachments = normalizeAttachments(announcement.materials);
      const result = await upsertMaterial({
        userId,
        externalId: `announcement:${announcement.id}`,
        sourceType: "announcement",
        courseGoogleId,
        courseName,
        title:
          (announcement.text ?? "Class announcement")
            .split("\n")[0]
            ?.trim()
            .slice(0, 220) || "Class announcement",
        description: announcement.text ?? null,
        alternateLink: announcement.alternateLink ?? null,
        topicId: null,
        state: announcement.state ?? null,
        extractedText: await extractTextFromDriveAttachments(drive, attachments),
        metadata: {
          creatorUserId: announcement.creatorUserId ?? null
        },
        publishedAt: normalizeGoogleDate(announcement.creationTime ?? announcement.updateTime),
        sourceUpdatedAt: normalizeGoogleDate(announcement.updateTime ?? announcement.creationTime),
        attachments
      });
      if (result.inserted) inserted += 1;
      if (result.updated) updated += 1;
    }

    const courseWorkData = await safeListClassroomItems(
      () =>
        classroom.courses.courseWork.list({
          courseId: courseGoogleId,
          pageSize: 20
        }),
      { courseWork: [] as Array<any> },
      `courseWork for course ${courseGoogleId}`
    );

    for (const work of courseWorkData.courseWork ?? []) {
      materialsScanned += 1;
      const attachments = normalizeAttachments(work.materials);
      const result = await upsertMaterial({
        userId,
        externalId: `course_work:${work.id}`,
        sourceType: "course_work",
        courseGoogleId,
        courseName,
        title: (work.title ?? "Course work").slice(0, 220),
        description: work.description ?? null,
        alternateLink: work.alternateLink ?? null,
        topicId: work.topicId ?? null,
        state: work.state ?? null,
        extractedText: await extractTextFromDriveAttachments(drive, attachments),
        metadata: {
          workType: work.workType ?? null,
          maxPoints: work.maxPoints ?? null,
          dueDate: work.dueDate ?? null,
          dueTime: work.dueTime ?? null
        },
        publishedAt: normalizeGoogleDate(work.creationTime ?? work.updateTime),
        sourceUpdatedAt: normalizeGoogleDate(work.updateTime ?? work.creationTime),
        attachments
      });
      if (result.inserted) inserted += 1;
      if (result.updated) updated += 1;
    }

    const courseMaterialsData = await safeListClassroomItems(
      () =>
        classroom.courses.courseWorkMaterials.list({
          courseId: courseGoogleId,
          pageSize: 20
        }),
      { courseWorkMaterial: [] as Array<any> },
      `courseWorkMaterials for course ${courseGoogleId}`
    );

    for (const material of courseMaterialsData.courseWorkMaterial ?? []) {
      materialsScanned += 1;
      const attachments = normalizeAttachments(material.materials);
      const result = await upsertMaterial({
        userId,
        externalId: `course_material:${material.id}`,
        sourceType: "course_material",
        courseGoogleId,
        courseName,
        title: (material.title ?? "Course material").slice(0, 220),
        description: material.description ?? null,
        alternateLink: material.alternateLink ?? null,
        topicId: material.topicId ?? null,
        state: material.state ?? null,
        extractedText: await extractTextFromDriveAttachments(drive, attachments),
        metadata: {
          creatorUserId: material.creatorUserId ?? null
        },
        publishedAt: normalizeGoogleDate(material.creationTime ?? material.updateTime),
        sourceUpdatedAt: normalizeGoogleDate(material.updateTime ?? material.creationTime),
        attachments
      });
      if (result.inserted) inserted += 1;
      if (result.updated) updated += 1;
    }
  }

  await db
    .update(googleClassroomConnections)
    .set({
      accessToken: oauth.credentials.access_token ?? connection.accessToken,
      refreshToken: oauth.credentials.refresh_token ?? connection.refreshToken,
      tokenExpiryAt: oauth.credentials.expiry_date
        ? new Date(oauth.credentials.expiry_date)
        : connection.tokenExpiryAt,
      lastSyncedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(googleClassroomConnections.id, connection.id));

  return {
    coursesScanned: courses.length,
    materialsScanned,
    inserted,
    updated
  };
}

export async function listGoogleClassroomMaterials(userId: string) {
  const materials = await db.query.googleClassroomMaterials.findMany({
    where: eq(googleClassroomMaterials.userId, userId),
    orderBy: [desc(googleClassroomMaterials.publishedAt), desc(googleClassroomMaterials.createdAt)]
  });

  return hydrateMaterials(userId, materials);
}

export async function getGoogleClassroomDashboardSummary(userId: string) {
  const connection = await getConnectionByUserId(userId);

  if (!connection) {
    return {
      connected: false,
      totalUpcomingCount: 0,
      assignmentsDueCount: 0,
      overdueAssignmentsCount: 0,
      quizzesComingCount: 0,
      upcomingAssignments: [] as DashboardItem[],
      upcomingQuizzes: [] as DashboardItem[]
    };
  }

  const materials = await db.query.googleClassroomMaterials.findMany({
    where: eq(googleClassroomMaterials.userId, userId),
    orderBy: [desc(googleClassroomMaterials.publishedAt), desc(googleClassroomMaterials.createdAt)]
  });

  const hydratedMaterials = await hydrateMaterials(userId, materials);
  const now = new Date();

  const assignments = hydratedMaterials
    .filter(isAssignmentLikeMaterial)
    .map((material) => ({ material, dueAt: getDueAt(material) }))
    .filter((entry): entry is { material: MaterialWithHydration; dueAt: Date } => Boolean(entry.dueAt))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  const quizzes = hydratedMaterials
    .filter((material) => material.sourceType === "course_work" && isQuizLikeMaterial(material))
    .map((material) => ({ material, dueAt: getDueAt(material) }))
    .filter((entry): entry is { material: MaterialWithHydration; dueAt: Date } => Boolean(entry.dueAt))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  const overdueAssignmentsCount = assignments.filter((entry) => entry.dueAt.getTime() < now.getTime()).length;
  const upcomingAssignments = assignments.filter((entry) =>
    isUpcomingWithin(entry.dueAt, ASSIGNMENT_LOOKAHEAD_DAYS, now)
  );
  const upcomingQuizCourseWork = quizzes.filter((entry) => isUpcomingWithin(entry.dueAt, QUIZ_LOOKAHEAD_DAYS, now));
  const recentQuizPosts = hydratedMaterials
    .filter((material) => material.sourceType !== "course_work" && isQuizLikeMaterial(material))
    .map((material) => ({
      material,
      referenceAt: getMaterialReferenceDate(material),
      eventAt: inferPostQuizAt(material)
    }))
    .filter(
      (entry): entry is { material: MaterialWithHydration; referenceAt: Date; eventAt: Date } =>
        Boolean(entry.referenceAt) && Boolean(entry.eventAt)
    )
    .filter(
      (entry) =>
        isRecentWithin(entry.referenceAt, QUIZ_POST_LOOKBACK_DAYS, now) &&
        isUpcomingWithin(entry.eventAt, QUIZ_LOOKAHEAD_DAYS, now)
    );

  const seenQuizKeys = new Set<string>();
  const mergedQuizCandidates: Array<{
    material: MaterialWithHydration;
    displayAt: Date;
    timingLabel: "due" | "posted";
  }> = [];

  for (const entry of upcomingQuizCourseWork) {
    const dedupKey = normalizeDashboardDedupKey(entry.material);
    if (seenQuizKeys.has(dedupKey)) continue;
    seenQuizKeys.add(dedupKey);
    mergedQuizCandidates.push({
      material: entry.material,
      displayAt: entry.dueAt,
      timingLabel: "due"
    });
  }

  for (const entry of recentQuizPosts) {
    const dedupKey = normalizeDashboardDedupKey(entry.material);
    if (seenQuizKeys.has(dedupKey)) continue;
    seenQuizKeys.add(dedupKey);
    mergedQuizCandidates.push({
      material: entry.material,
      displayAt: entry.eventAt,
      timingLabel: "due"
    });
  }

  mergedQuizCandidates.sort((a, b) => a.displayAt.getTime() - b.displayAt.getTime());

  const assignmentItems = await Promise.all(
    upcomingAssignments.slice(0, 3).map(async ({ material, dueAt }) => {
      const insight = await generateDashboardInsight(material, "assignment");

      return {
        materialId: material.id,
        title: material.title,
        courseName: material.courseName,
        description: material.description,
        alternateLink: material.alternateLink,
        displayAt: dueAt.toISOString(),
        timingLabel: "due" as const,
        workType: getMaterialWorkType(material),
        itemType: "assignment" as const,
        sourceType: material.sourceType,
        summary: insight.summary,
        support: insight.support
      };
    })
  );

  const quizItems = await Promise.all(
    mergedQuizCandidates.slice(0, 4).map(async ({ material, displayAt, timingLabel }) => {
      const insight = await generateDashboardInsight(material, "quiz");

      return {
        materialId: material.id,
        title: material.title,
        courseName: material.courseName,
        description: material.description,
        alternateLink: material.alternateLink,
        displayAt: displayAt.toISOString(),
        timingLabel,
        workType: getMaterialWorkType(material),
        itemType: "quiz" as const,
        sourceType: material.sourceType,
        summary: insight.summary,
        support: insight.support
      };
    })
  );

  return {
    connected: true,
    totalUpcomingCount: upcomingAssignments.length + mergedQuizCandidates.length,
    assignmentsDueCount: upcomingAssignments.length,
    overdueAssignmentsCount,
    quizzesComingCount: mergedQuizCandidates.length,
    upcomingAssignments: assignmentItems,
    upcomingQuizzes: quizItems
  };
}

export async function generateGoogleClassroomQuizPrep(userId: string, materialId: string) {
  const material = await getOwnedMaterial(userId, materialId);

  const courseName = material.courseName?.trim();
  if (!courseName) {
    throw new AppError("This Classroom item is not linked to a course name", 422);
  }

  const relatedMaterials = await db.query.googleClassroomMaterials.findMany({
    where: eq(googleClassroomMaterials.userId, userId),
    orderBy: [desc(googleClassroomMaterials.publishedAt), desc(googleClassroomMaterials.createdAt)]
  });

  const normalizedCourseName = normalizeCourseName(courseName);
  const supplementalContext = relatedMaterials
    .filter(
      (candidate) =>
        candidate.id !== material.id && normalizeCourseName(candidate.courseName ?? "") === normalizedCourseName
    )
    .slice(0, 6)
    .map((candidate) => ({
      label: candidate.title,
      content: [
        candidate.description ?? "",
        candidate.extractedText ?? ""
      ]
        .filter(Boolean)
        .join("\n\n")
        .trim()
    }))
    .filter((candidate) => candidate.content);

  supplementalContext.unshift({
    label: "Quiz announcement",
    content: [material.title, material.description ?? "", material.extractedText ?? ""]
      .filter(Boolean)
      .join("\n\n")
      .trim()
  });

  return buildQuizPrepPack(
    userId,
    courseName,
    [material.title, material.description ?? ""].filter(Boolean).join("\n\n"),
    supplementalContext
  );
}

export async function getGoogleClassroomMaterialDetail(userId: string, materialId: string) {
  const material = await getOwnedMaterial(userId, materialId);

  const [attachments, analysis, quizzes, questions, attempts] = await Promise.all([
    db.query.googleClassroomMaterialAttachments.findMany({
      where: and(
        eq(googleClassroomMaterialAttachments.userId, userId),
        eq(googleClassroomMaterialAttachments.materialId, material.id)
      )
    }),
    db.query.materialAiAnalyses.findFirst({
      where: and(eq(materialAiAnalyses.userId, userId), eq(materialAiAnalyses.materialId, material.id))
    }),
    db.query.materialQuizzes.findMany({
      where: and(eq(materialQuizzes.userId, userId), eq(materialQuizzes.materialId, material.id)),
      orderBy: desc(materialQuizzes.createdAt)
    }),
    db.query.materialQuizQuestions.findMany({
      where: and(eq(materialQuizQuestions.userId, userId), eq(materialQuizQuestions.materialId, material.id))
    }),
    db.query.materialQuizAttempts.findMany({
      where: and(eq(materialQuizAttempts.userId, userId), eq(materialQuizAttempts.materialId, material.id)),
      orderBy: desc(materialQuizAttempts.createdAt)
    })
  ]);

  return {
    ...material,
    attachments,
    analysis: analysis ?? null,
    quizzes: mapQuizWithQuestions(quizzes, questions),
    attempts
  };
}

export async function listGoogleClassroomQuizPrep(userId: string) {
  const [quizzes, attempts, materials] = await Promise.all([
    db.query.materialQuizzes.findMany({
      where: eq(materialQuizzes.userId, userId),
      orderBy: desc(materialQuizzes.createdAt)
    }),
    db.query.materialQuizAttempts.findMany({
      where: eq(materialQuizAttempts.userId, userId),
      orderBy: desc(materialQuizAttempts.createdAt)
    }),
    db.query.googleClassroomMaterials.findMany({
      where: eq(googleClassroomMaterials.userId, userId)
    })
  ]);

  const attemptsByQuizId = new Map<string, Array<typeof materialQuizAttempts.$inferSelect>>();
  for (const attempt of attempts) {
    const group = attemptsByQuizId.get(attempt.quizId) ?? [];
    group.push(attempt);
    attemptsByQuizId.set(attempt.quizId, group);
  }

  const materialById = new Map(materials.map((material) => [material.id, material]));

  return quizzes.map((quiz) => {
    const quizAttempts = attemptsByQuizId.get(quiz.id) ?? [];
    const material = materialById.get(quiz.materialId) ?? null;
    const bestScore =
      quizAttempts.length > 0
        ? quizAttempts.reduce((highest, attempt) => Math.max(highest, attempt.score), quizAttempts[0]!.score)
        : null;

    return {
      ...quiz,
      materialTitle: material?.title ?? "Unknown material",
      courseName: material?.courseName ?? null,
      latestAttempt: quizAttempts[0] ?? null,
      attempts: quizAttempts,
      attemptCount: quizAttempts.length,
      bestScore
    };
  });
}

export async function analyzeGoogleClassroomMaterial(userId: string, materialId: string) {
  const material = await getOwnedMaterial(userId, materialId);
  const attachments = await db.query.googleClassroomMaterialAttachments.findMany({
    where: and(
      eq(googleClassroomMaterialAttachments.userId, userId),
      eq(googleClassroomMaterialAttachments.materialId, material.id)
    )
  });

  const sourceText = formatSourceText({
    courseName: material.courseName,
    title: material.title,
    description: material.description,
    extractedText: material.extractedText,
    sourceType: material.sourceType,
    attachments: attachments.map((attachment) => ({
      attachmentType: attachment.attachmentType,
      title: attachment.title,
      url: attachment.url,
      driveFileId: attachment.driveFileId,
      mimeType: attachment.mimeType,
      thumbnailUrl: attachment.thumbnailUrl,
      metadata:
        attachment.metadata && typeof attachment.metadata === "object"
          ? (attachment.metadata as Record<string, unknown>)
          : null
    }))
  });

  const response = await ensureOpenAI().chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You analyze Google Classroom materials for students. Return JSON with keys summary, keyPoints, topicTags. summary must be a concise paragraph. keyPoints must be an array of short strings. topicTags must be an array of 3 to 8 short strings."
      },
      {
        role: "user",
        content: `Analyze this study material for a student:\n\n${sourceText}`
      }
    ]
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new AppError("Model returned an empty analysis", 502);
  }

  let parsed: {
    summary?: unknown;
    keyPoints?: unknown;
    topicTags?: unknown;
  };

  try {
    parsed = JSON.parse(extractJsonPayload(raw));
  } catch {
    throw new AppError("Model returned invalid analysis JSON", 502);
  }

  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const keyPoints = Array.isArray(parsed.keyPoints)
    ? parsed.keyPoints.filter((item): item is string => typeof item === "string").map((item) => item.trim())
    : [];
  const topicTags = Array.isArray(parsed.topicTags)
    ? parsed.topicTags.filter((item): item is string => typeof item === "string").map((item) => item.trim())
    : [];

  if (!summary) {
    throw new AppError("Analysis summary is empty", 502);
  }

  const existing = await db.query.materialAiAnalyses.findFirst({
    where: and(eq(materialAiAnalyses.userId, userId), eq(materialAiAnalyses.materialId, material.id))
  });

  if (existing) {
    const updated = await db
      .update(materialAiAnalyses)
      .set({
        summary,
        keyPoints,
        topicTags,
        sourceText,
        updatedAt: new Date()
      })
      .where(eq(materialAiAnalyses.id, existing.id))
      .returning();

    return updated[0];
  }

  const inserted = await db
    .insert(materialAiAnalyses)
    .values({
      id: crypto.randomUUID(),
      materialId: material.id,
      userId,
      summary,
      keyPoints,
      topicTags,
      sourceText,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();

  return inserted[0];
}

export async function generateGoogleClassroomMaterialQuiz(
  userId: string,
  materialId: string,
  requestedQuestionCount = 5
) {
  const material = await getOwnedMaterial(userId, materialId);
  const attachments = await db.query.googleClassroomMaterialAttachments.findMany({
    where: and(
      eq(googleClassroomMaterialAttachments.userId, userId),
      eq(googleClassroomMaterialAttachments.materialId, material.id)
    )
  });

  const sourceText = formatSourceText({
    courseName: material.courseName,
    title: material.title,
    description: material.description,
    extractedText: material.extractedText,
    sourceType: material.sourceType,
    attachments: attachments.map((attachment) => ({
      attachmentType: attachment.attachmentType,
      title: attachment.title,
      url: attachment.url,
      driveFileId: attachment.driveFileId,
      mimeType: attachment.mimeType,
      thumbnailUrl: attachment.thumbnailUrl,
      metadata:
        attachment.metadata && typeof attachment.metadata === "object"
          ? (attachment.metadata as Record<string, unknown>)
          : null
    }))
  });

  const totalQuestions = clampQuestionCount(requestedQuestionCount);
  const response = await ensureOpenAI().chat.completions.create({
    model: env.openaiModel,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate quizzes for students from study materials. Return JSON with keys title, instructions, questions. questions must be an array of objects with keys question, options, answer, explanation. Use only multiple choice questions with exactly 4 string options."
      },
      {
        role: "user",
        content: `Create a ${totalQuestions}-question quiz from this material:\n\n${sourceText}`
      }
    ]
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new AppError("Model returned an empty quiz", 502);
  }

  let parsed: {
    title?: unknown;
    instructions?: unknown;
    questions?: unknown;
  };

  try {
    parsed = JSON.parse(extractJsonPayload(raw));
  } catch {
    throw new AppError("Model returned invalid quiz JSON", 502);
  }

  const questionsPayload = Array.isArray(parsed.questions) ? parsed.questions : [];
  const sanitizedQuestions = questionsPayload
    .map((question, index) => {
      if (!question || typeof question !== "object") {
        return null;
      }

      const typedQuestion = question as Record<string, unknown>;
      const prompt = typeof typedQuestion.question === "string" ? typedQuestion.question.trim() : "";
      const options = Array.isArray(typedQuestion.options)
        ? typedQuestion.options.filter((item): item is string => typeof item === "string").map((item) => item.trim())
        : [];
      const answer = typeof typedQuestion.answer === "string" ? typedQuestion.answer.trim() : "";
      const explanation =
        typeof typedQuestion.explanation === "string" ? typedQuestion.explanation.trim() : null;

      if (!prompt || options.length !== 4 || !answer) {
        return null;
      }

      return {
        id: crypto.randomUUID(),
        quizId: "",
        materialId: material.id,
        userId,
        position: index,
        type: "multiple_choice",
        question: prompt,
        options,
        answer,
        explanation,
        createdAt: new Date()
      };
    })
    .filter((question): question is NonNullable<typeof question> => Boolean(question));

  if (sanitizedQuestions.length === 0) {
    throw new AppError("Quiz generation returned no valid questions", 502);
  }

  const quizId = crypto.randomUUID();
  const title =
    typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim()
      : `${material.title} Quiz`;
  const instructions =
    typeof parsed.instructions === "string" && parsed.instructions.trim()
      ? parsed.instructions.trim()
      : "Answer each question using the material summary and attachments.";

  const insertedQuiz = (
    await db
      .insert(materialQuizzes)
      .values({
        id: quizId,
        materialId: material.id,
        userId,
        title,
        instructions,
        totalQuestions: sanitizedQuestions.length,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()
  )[0];

  const insertedQuestions = await db
    .insert(materialQuizQuestions)
    .values(
      sanitizedQuestions.map((question) => ({
        ...question,
        quizId
      }))
    )
    .returning();

  return {
    ...insertedQuiz,
    questions: insertedQuestions.sort((a, b) => a.position - b.position)
  };
}

export async function submitGoogleClassroomQuizAttempt(
  userId: string,
  quizId: string,
  answers: QuizAnswerInput[]
) {
  const quiz = await db.query.materialQuizzes.findFirst({
    where: and(eq(materialQuizzes.id, quizId), eq(materialQuizzes.userId, userId))
  });

  if (!quiz) {
    throw new AppError("Quiz not found", 404);
  }

  const questions = await db.query.materialQuizQuestions.findMany({
    where: and(eq(materialQuizQuestions.quizId, quizId), eq(materialQuizQuestions.userId, userId))
  });

  if (questions.length === 0) {
    throw new AppError("Quiz has no questions", 422);
  }

  const answerMap = new Map(
    answers
      .filter(
        (answer): answer is QuizAnswerInput =>
          Boolean(answer?.questionId) && typeof answer.answer === "string"
      )
      .map((answer) => [answer.questionId, answer.answer])
  );

  let score = 0;
  const results = questions
    .sort((a, b) => a.position - b.position)
    .map((question) => {
      const submittedAnswer = answerMap.get(question.id) ?? "";
      const isCorrect = normalizeAnswer(submittedAnswer) === normalizeAnswer(question.answer);
      if (isCorrect) {
        score += 1;
      }

      return {
        questionId: question.id,
        submittedAnswer,
        correctAnswer: question.answer,
        isCorrect
      };
    });

  const insertedAttempt = (
    await db
      .insert(materialQuizAttempts)
      .values({
        id: crypto.randomUUID(),
        quizId: quiz.id,
        materialId: quiz.materialId,
        userId,
        score,
        totalQuestions: questions.length,
        answers: results,
        createdAt: new Date()
      })
      .returning()
  )[0];

  return {
    ...insertedAttempt,
    results
  };
}

export function buildGoogleClassroomErrorRedirect(errorMessage: string) {
  return buildFrontendRedirectUrl("error", errorMessage);
}
