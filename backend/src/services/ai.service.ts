import OpenAI from "openai";

import { env } from "../config/env";
import { AppError } from "../middleware/error.middleware";
import { sanitizeTimetableSubjectName } from "../utils/timetable-subject";
import { getNoteById, getNoteByIdForUser, updateNoteSummary } from "./notes.service";

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

export type ExtractedTimetableEntry = {
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  startTime: string;
  endTime: string;
  subjectName: string;
};

type RawExtractedTimetableEntry = {
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  subjectName?: string;
};

type TimetableVisionResponse = {
  entries?: RawExtractedTimetableEntry[];
  days?:
    | Array<{
        dayOfWeek?: string;
        entries?: RawExtractedTimetableEntry[];
      }>
    | Record<string, RawExtractedTimetableEntry[]>;
};

function ensureOpenAI() {
  if (!openai) {
    throw new AppError("OPENAI_API_KEY is not configured", 500);
  }

  return openai;
}

function extractJsonPayload(raw: string) {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fencedMatch?.[1]?.trim() ?? trimmed;
}

function normalizeDayOfWeek(value: string) {
  const normalized = value.trim().toLowerCase();
  const dayMap: Record<string, ExtractedTimetableEntry["dayOfWeek"]> = {
    mon: "MONDAY",
    monday: "MONDAY",
    tue: "TUESDAY",
    tues: "TUESDAY",
    tuesday: "TUESDAY",
    wed: "WEDNESDAY",
    weds: "WEDNESDAY",
    wednesday: "WEDNESDAY",
    thu: "THURSDAY",
    thur: "THURSDAY",
    thurs: "THURSDAY",
    thursday: "THURSDAY",
    fri: "FRIDAY",
    friday: "FRIDAY",
    sat: "SATURDAY",
    saturday: "SATURDAY",
    sun: "SUNDAY",
    sunday: "SUNDAY"
  };

  return dayMap[normalized] ?? null;
}

function normalizeTime(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/\./g, ":")
    .replace(/\s+/g, " ");

  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "00");
  const meridiem = match[3]?.toLowerCase();

  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59) {
    return null;
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) {
      return null;
    }

    if (meridiem === "am") {
      hour = hour === 12 ? 0 : hour;
    } else {
      hour = hour === 12 ? 12 : hour + 12;
    }
  } else if (hour > 23) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeTimeField(value: string, edge: "start" | "end") {
  const direct = normalizeTime(value);
  if (direct) {
    return direct;
  }

  const rangeSegments = value
    .split(/\s*(?:-|–|—|to)\s*/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (rangeSegments.length >= 2) {
    return normalizeTime(edge === "start" ? rangeSegments[0] : rangeSegments[rangeSegments.length - 1]);
  }

  return null;
}

function normalizeSubjectName(value: string) {
  return sanitizeTimetableSubjectName(value);
}

function encodeImageAsDataUrl(file: Express.Multer.File) {
  if (!file.mimetype.startsWith("image/")) {
    throw new AppError("Upload a JPG, PNG, WEBP, or other image file.", 415);
  }

  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

function flattenVisionEntries(payload: TimetableVisionResponse) {
  const entries: RawExtractedTimetableEntry[] = [...(payload.entries ?? [])];

  if (Array.isArray(payload.days)) {
    for (const dayGroup of payload.days) {
      const dayOfWeek = dayGroup.dayOfWeek;
      for (const entry of dayGroup.entries ?? []) {
        entries.push({
          ...entry,
          dayOfWeek: entry.dayOfWeek ?? dayOfWeek
        });
      }
    }
  } else if (payload.days && typeof payload.days === "object") {
    for (const [dayOfWeek, dayEntries] of Object.entries(payload.days)) {
      if (!Array.isArray(dayEntries)) {
        continue;
      }

      for (const entry of dayEntries) {
        entries.push({
          ...entry,
          dayOfWeek: entry.dayOfWeek ?? dayOfWeek
        });
      }
    }
  }

  return entries;
}

function normalizeExtractedEntries(entries: RawExtractedTimetableEntry[]) {
  return entries
    .map((entry) => {
      const dayOfWeek = entry.dayOfWeek ? normalizeDayOfWeek(entry.dayOfWeek) : null;
      const startTime = entry.startTime ? normalizeTimeField(entry.startTime, "start") : null;
      const endTime = entry.endTime ? normalizeTimeField(entry.endTime, "end") : null;
      const subjectName = entry.subjectName ? normalizeSubjectName(entry.subjectName) : "";

      if (!dayOfWeek || !startTime || !endTime || !subjectName) {
        return null;
      }

      if (startTime >= endTime) {
        return null;
      }

      return {
        dayOfWeek,
        startTime,
        endTime,
        subjectName
      };
    })
    .filter((entry): entry is ExtractedTimetableEntry => Boolean(entry));
}

async function runTimetableVisionPass(
  client: OpenAI,
  model: string,
  imageUrl: string,
  systemPrompt: string,
  userPrompt: string
) {
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userPrompt
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high"
            } as { url: string; detail: "high" }
          }
        ]
      }
    ]
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(extractJsonPayload(raw)) as TimetableVisionResponse;
    return normalizeExtractedEntries(flattenVisionEntries(parsed));
  } catch {
    return [];
  }
}

export async function summarizeText(text: string): Promise<string> {
  const client = ensureOpenAI();

  const response = await client.chat.completions.create({
    model: env.openaiModel,
    messages: [
      {
        role: "system",
        content:
          "You summarize student class notes into concise bullet points with action items and key terms."
      },
      {
        role: "user",
        content: `Summarize these notes:\n\n${text}`
      }
    ],
    temperature: 0.2
  });

  const summary = response.choices[0]?.message?.content?.trim();

  if (!summary) {
    throw new AppError("Model returned an empty summary", 502);
  }

  return summary;
}

export async function askAIAboutText(text: string, question: string): Promise<{ answer: string }> {
  const client = ensureOpenAI();

  const response = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You answer questions about student notes. Use only the provided text. If the answer is not supported by the text, say that clearly."
      },
      {
        role: "user",
        content: `Text:\n\n${text}\n\nQuestion:\n${question}`
      }
    ]
  });

  const answer = response.choices[0]?.message?.content?.trim();
  if (!answer) {
    throw new AppError("Model returned an empty answer", 502);
  }

  return { answer };
}

export async function summarizeNoteById(noteId: string): Promise<{ noteId: string; summary: string }> {
  const note = await getNoteById(noteId);

  if (!note) {
    throw new AppError("Note not found", 404);
  }

  const summary = await summarizeText(note.content);
  await updateNoteSummary(noteId, summary);

  return { noteId, summary };
}

export async function askAIAboutNote(
  userId: string,
  noteId: string,
  question: string
): Promise<{ noteId: string; answer: string }> {
  const note = await getNoteByIdForUser(userId, noteId);

  if (!note) {
    throw new AppError("Note not found", 404);
  }

  const client = ensureOpenAI();
  const response = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You answer questions about a student's class note. Use only the note content provided. If the answer is not in the note, say that clearly and avoid inventing details."
      },
      {
        role: "user",
        content: `Note content:\n\n${note.content}\n\nQuestion:\n${question}`
      }
    ]
  });

  const answer = response.choices[0]?.message?.content?.trim();

  if (!answer) {
    throw new AppError("Model returned an empty answer", 502);
  }

  return {
    noteId,
    answer
  };
}

export async function extractTimetableEntriesFromImage(
  file: Express.Multer.File
): Promise<ExtractedTimetableEntry[]> {
  const client = ensureOpenAI();
  const imageUrl = encodeImageAsDataUrl(file);
  const systemPrompt =
    "You extract weekly class schedules from timetable images. Return only valid JSON with an `entries` array. Each item must have dayOfWeek, startTime, endTime, subjectName. dayOfWeek must be a weekday name, startTime and endTime must be 24-hour HH:mm strings, and subjectName must be concise. Never invent classes, but do include all clearly visible timetable cards, even if the screenshot is a dark UI or only a partial page capture. Ignore non-class blocks like lunch, break, or recess. If a subject ends with a room or venue token such as NB208 or NB 208, keep only the course name and exclude the venue from subjectName.";

  const primaryEntries = await runTimetableVisionPass(
    client,
    env.openaiModel,
    imageUrl,
    systemPrompt,
    "Read this timetable image and extract all visible recurring classes into JSON. The screenshot may be a dark-themed app UI with weekday headers and separate class cards. Make sure you capture every visible class card under each visible day header. If the image is unreadable, return {\"entries\": []}."
  );

  const secondaryEntries = await runTimetableVisionPass(
    client,
    env.openaiModel,
    imageUrl,
    systemPrompt,
    "Do a second careful pass over this timetable screenshot. Count the visible class cards under each visible weekday heading and extract them all. Include partially visible cards if their day, subject, and time range are readable. Return only JSON."
  );

  const groupedEntries = await runTimetableVisionPass(
    client,
    env.openaiModel,
    imageUrl,
    systemPrompt,
    "Read the timetable by weekday sections. Return JSON grouped by visible weekday headings, using either {\"days\": [{\"dayOfWeek\": \"MONDAY\", \"entries\": [...]}]} or an equivalent days object. Capture all visible cards under each day header. If multiple classes appear side by side on one day, include every one of them."
  );

  const deduped = new Map<string, ExtractedTimetableEntry>();
  for (const entry of [...primaryEntries, ...secondaryEntries, ...groupedEntries]) {
    deduped.set(
      `${entry.dayOfWeek}|${entry.startTime}|${entry.endTime}|${entry.subjectName.toLowerCase()}`,
      entry
    );
  }

  return Array.from(deduped.values());
}
