import { eq, lt, gt, lte, and, asc, desc, ne } from "drizzle-orm";
import { db } from "../lib/db";
import { notes, timetables } from "../lib/drizzle/schema";
import { AppError } from "../middleware/error.middleware";
import { isIgnoredTimetableSubject, sanitizeTimetableSubjectName } from "../utils/timetable-subject";
import { getDayOfWeekEnum, toHHMM } from "../utils/time";
import { extractTimetableEntriesFromImage, type ExtractedTimetableEntry } from "./ai.service";

type CreateTimetableInput = {
  userId: string;
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  startTime: string;
  endTime: string;
  subjectName: string;
};

type UpdateTimetableInput = CreateTimetableInput & {
  timetableId: string;
};

export type TimetableImportMode = "merge" | "replace";

export type TimetableImportResult = {
  mode: TimetableImportMode;
  extractedCount: number;
  insertedCount: number;
  skippedDuplicateCount: number;
  skippedConflictCount: number;
  removedExistingCount: number;
  finalCount: number;
  inserted: Array<Awaited<ReturnType<typeof createTimetableEntry>>>;
  skippedDuplicates: ExtractedTimetableEntry[];
  skippedConflicts: ExtractedTimetableEntry[];
};

function entriesOverlap(
  first: Pick<CreateTimetableInput, "dayOfWeek" | "startTime" | "endTime">,
  second: Pick<CreateTimetableInput, "dayOfWeek" | "startTime" | "endTime">
) {
  return (
    first.dayOfWeek === second.dayOfWeek &&
    first.startTime < second.endTime &&
    first.endTime > second.startTime
  );
}

function isExactDuplicate(
  first: Pick<CreateTimetableInput, "dayOfWeek" | "startTime" | "endTime" | "subjectName">,
  second: Pick<CreateTimetableInput, "dayOfWeek" | "startTime" | "endTime" | "subjectName">
) {
  return (
    first.dayOfWeek === second.dayOfWeek &&
    first.startTime === second.startTime &&
    first.endTime === second.endTime &&
    first.subjectName.trim().toLowerCase() === second.subjectName.trim().toLowerCase()
  );
}

function presentTimetableEntry<T extends { subjectName: string }>(entry: T) {
  return {
    ...entry,
    subjectName: sanitizeTimetableSubjectName(entry.subjectName)
  };
}

function isVisibleTimetableEntry<T extends { subjectName: string }>(entry: T) {
  return !isIgnoredTimetableSubject(entry.subjectName);
}

async function ensureTimetableOwnership(userId: string, timetableId: string) {
  const entry = await db.query.timetables.findFirst({
    where: and(eq(timetables.id, timetableId), eq(timetables.userId, userId))
  });

  if (!entry) {
    throw new AppError("Timetable entry not found", 404);
  }

  return entry;
}

async function assertNoConflictingTimetableEntry(
  input: CreateTimetableInput,
  excludeTimetableId?: string
) {
  if (input.startTime >= input.endTime) {
    throw new AppError("startTime must be before endTime", 422);
  }

  const overlaps = await db.query.timetables.findMany({
    where: and(
      eq(timetables.userId, input.userId),
      eq(timetables.dayOfWeek, input.dayOfWeek),
      lt(timetables.startTime, input.endTime),
      gt(timetables.endTime, input.startTime),
      excludeTimetableId ? ne(timetables.id, excludeTimetableId) : undefined
    )
  });

  if (overlaps.some(isVisibleTimetableEntry)) {
    throw new AppError("Timetable conflict: overlapping class already exists", 409);
  }
}

export async function createTimetableEntry(input: CreateTimetableInput) {
  const subjectName = sanitizeTimetableSubjectName(input.subjectName);
  if (!subjectName) {
    throw new AppError("Use only real class names in the timetable", 422);
  }

  await assertNoConflictingTimetableEntry({ ...input, subjectName });

  const result = await db
    .insert(timetables)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      subjectName
    })
    .returning();

  return presentTimetableEntry(result[0]);
}

export async function updateTimetableEntry(input: UpdateTimetableInput) {
  const subjectName = sanitizeTimetableSubjectName(input.subjectName);
  if (!subjectName) {
    throw new AppError("Use only real class names in the timetable", 422);
  }

  await ensureTimetableOwnership(input.userId, input.timetableId);
  await assertNoConflictingTimetableEntry({ ...input, subjectName }, input.timetableId);

  const result = await db
    .update(timetables)
    .set({
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      subjectName,
      updatedAt: new Date()
    })
    .where(and(eq(timetables.id, input.timetableId), eq(timetables.userId, input.userId)))
    .returning();

  return presentTimetableEntry(result[0]);
}

export async function deleteTimetableEntry(userId: string, timetableId: string) {
  const entry = await ensureTimetableOwnership(userId, timetableId);

  await db.delete(notes).where(and(eq(notes.userId, userId), eq(notes.timetableId, timetableId)));
  await db.delete(timetables).where(and(eq(timetables.id, timetableId), eq(timetables.userId, userId)));

  return presentTimetableEntry(entry);
}

export async function listTimetableEntries(userId: string) {
  const entries = await db.query.timetables.findMany({
    where: eq(timetables.userId, userId),
    orderBy: [asc(timetables.dayOfWeek), asc(timetables.startTime)]
  });

  return entries.filter(isVisibleTimetableEntry).map(presentTimetableEntry);
}

export async function getCurrentClass(userId: string, now: Date) {
  const dayOfWeek = getDayOfWeekEnum(now);
  const currentTime = toHHMM(now);

  const entries = await db.query.timetables.findMany({
    where: and(
      eq(timetables.userId, userId),
      eq(timetables.dayOfWeek, dayOfWeek),
      lte(timetables.startTime, currentTime),
      gt(timetables.endTime, currentTime)
    ),
    orderBy: asc(timetables.startTime)
  });

  const currentClass = entries.find(isVisibleTimetableEntry);
  return currentClass ? presentTimetableEntry(currentClass) : null;
}

export async function getNextClass(userId: string, now: Date) {
  const dayOfWeek = getDayOfWeekEnum(now);
  const currentTime = toHHMM(now);

  const entries = await db.query.timetables.findMany({
    where: and(
      eq(timetables.userId, userId),
      eq(timetables.dayOfWeek, dayOfWeek),
      gt(timetables.startTime, currentTime)
    ),
    orderBy: asc(timetables.startTime)
  });

  const nextClass = entries.find(isVisibleTimetableEntry);
  return nextClass ? presentTimetableEntry(nextClass) : null;
}

export async function importTimetableFromImage(
  userId: string,
  file: Express.Multer.File,
  mode: TimetableImportMode = "merge"
): Promise<TimetableImportResult> {
  const extractedEntries = await extractTimetableEntriesFromImage(file);

  if (extractedEntries.length === 0) {
    throw new AppError(
      "Could not identify any timetable rows from that image. Try a clearer screenshot or crop the timetable area.",
      422
    );
  }

  const existingEntries = await listTimetableEntries(userId);
  let removedExistingCount = 0;

  if (mode === "replace" && existingEntries.length > 0) {
    removedExistingCount = existingEntries.length;
    await db.delete(notes).where(eq(notes.userId, userId));
    await db.delete(timetables).where(eq(timetables.userId, userId));
  }

  const workingEntries = mode === "replace" ? [] : [...existingEntries];
  const inserted: TimetableImportResult["inserted"] = [];
  const skippedDuplicates: ExtractedTimetableEntry[] = [];
  const skippedConflicts: ExtractedTimetableEntry[] = [];

  for (const entry of extractedEntries) {
    if (workingEntries.some((existingEntry) => isExactDuplicate(existingEntry, entry))) {
      skippedDuplicates.push(entry);
      continue;
    }

    if (workingEntries.some((existingEntry) => entriesOverlap(existingEntry, entry))) {
      skippedConflicts.push(entry);
      continue;
    }

    const created = await createTimetableEntry({
      userId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subjectName: entry.subjectName
    });

    inserted.push(created);
    workingEntries.push(created);
  }

  return {
    mode,
    extractedCount: extractedEntries.length,
    insertedCount: inserted.length,
    skippedDuplicateCount: skippedDuplicates.length,
    skippedConflictCount: skippedConflicts.length,
    removedExistingCount,
    finalCount: workingEntries.length,
    inserted,
    skippedDuplicates,
    skippedConflicts
  };
}
