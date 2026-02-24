import { eq, lt, gt, lte, and, asc, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { timetables } from "../lib/drizzle/schema";
import { AppError } from "../middleware/error.middleware";
import { getDayOfWeekEnum, toHHMM } from "../utils/time";

type CreateTimetableInput = {
  userId: string;
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  startTime: string;
  endTime: string;
  subjectName: string;
};

export async function createTimetableEntry(input: CreateTimetableInput) {
  if (input.startTime >= input.endTime) {
    throw new AppError("startTime must be before endTime", 422);
  }

  const overlap = await db.query.timetables.findFirst({
    where: and(
      eq(timetables.userId, input.userId),
      eq(timetables.dayOfWeek, input.dayOfWeek),
      lt(timetables.startTime, input.endTime),
      gt(timetables.endTime, input.startTime)
    )
  });

  if (overlap) {
    throw new AppError("Timetable conflict: overlapping class already exists", 409);
  }

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
