import { eq, lt, gt, lte, and, asc, desc, ne } from "drizzle-orm";
import { db } from "../lib/db";
import { notes, timetables } from "../lib/drizzle/schema";
import { AppError } from "../middleware/error.middleware";
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

export type TimetableImportResult = {
  extractedCount: number;
  insertedCount: number;
  skippedDuplicateCount: number;
  skippedConflictCount: number;
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

  const overlap = await db.query.timetables.findFirst({
    where: and(
      eq(timetables.userId, input.userId),
      eq(timetables.dayOfWeek, input.dayOfWeek),
      lt(timetables.startTime, input.endTime),
      gt(timetables.endTime, input.startTime),
      excludeTimetableId ? ne(timetables.id, excludeTimetableId) : undefined
    )
  });

  if (overlap) {
    throw new AppError("Timetable conflict: overlapping class already exists", 409);
  }
}

export async function createTimetableEntry(input: CreateTimetableInput) {
  await assertNoConflictingTimetableEntry(input);

  const result = await db
    .insert(timetables)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      subjectName: input.subjectName.trim()
    })
    .returning();

  return result[0];
}

export async function updateTimetableEntry(input: UpdateTimetableInput) {
  await ensureTimetableOwnership(input.userId, input.timetableId);
  await assertNoConflictingTimetableEntry(input, input.timetableId);

  const result = await db
    .update(timetables)
    .set({
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      subjectName: input.subjectName.trim(),
      updatedAt: new Date()
    })
    .where(and(eq(timetables.id, input.timetableId), eq(timetables.userId, input.userId)))
    .returning();

  return result[0];
}

export async function deleteTimetableEntry(userId: string, timetableId: string) {
  const entry = await ensureTimetableOwnership(userId, timetableId);

  await db.delete(notes).where(and(eq(notes.userId, userId), eq(notes.timetableId, timetableId)));
  await db.delete(timetables).where(and(eq(timetables.id, timetableId), eq(timetables.userId, userId)));

  return entry;
}

export async function listTimetableEntries(userId: string) {
  return db.query.timetables.findMany({
    where: eq(timetables.userId, userId),
    orderBy: [asc(timetables.dayOfWeek), asc(timetables.startTime)]
  });
}

export async function getCurrentClass(userId: string, now: Date) {
  const dayOfWeek = getDayOfWeekEnum(now);
  const currentTime = toHHMM(now);

  return db.query.timetables.findFirst({
    where: and(
      eq(timetables.userId, userId),
      eq(timetables.dayOfWeek, dayOfWeek),
      lte(timetables.startTime, currentTime),
      gt(timetables.endTime, currentTime)
    )
  });
}

export async function getNextClass(userId: string, now: Date) {
  const dayOfWeek = getDayOfWeekEnum(now);
  const currentTime = toHHMM(now);

  return db.query.timetables.findFirst({
    where: and(
      eq(timetables.userId, userId),
      eq(timetables.dayOfWeek, dayOfWeek),
      gt(timetables.startTime, currentTime)
    ),
    orderBy: asc(timetables.startTime)
  });
}

export async function importTimetableFromImage(
  userId: string,
  file: Express.Multer.File
): Promise<TimetableImportResult> {
  const extractedEntries = await extractTimetableEntriesFromImage(file);

  if (extractedEntries.length === 0) {
    throw new AppError(
      "Could not identify any timetable rows from that image. Try a clearer screenshot or crop the timetable area.",
      422
    );
  }

  const existingEntries = await listTimetableEntries(userId);
  const workingEntries = [...existingEntries];
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
    extractedCount: extractedEntries.length,
    insertedCount: inserted.length,
    skippedDuplicateCount: skippedDuplicates.length,
    skippedConflictCount: skippedConflicts.length,
    inserted,
    skippedDuplicates,
    skippedConflicts
  };
}
