import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "../lib/db";
import { courseDocuments, courses, notes, timetables } from "../lib/drizzle/schema";
import { AppError } from "../middleware/error.middleware";

function normalizeCourseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function sanitizeCourseName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

async function ensureCourse(userId: string, rawName: string) {
  const name = sanitizeCourseName(rawName);
  const normalizedName = normalizeCourseName(name);

  const existing = await db.query.courses.findFirst({
    where: and(eq(courses.userId, userId), eq(courses.normalizedName, normalizedName))
  });

  if (existing) {
    return existing;
  }

  const inserted = await db
    .insert(courses)
    .values({
      id: crypto.randomUUID(),
      userId,
      name,
      normalizedName
    })
    .returning();

  return inserted[0];
}

async function backfillFromTimetable(userId: string) {
  const entries = await db.query.timetables.findMany({
    where: eq(timetables.userId, userId)
  });

  for (const entry of entries) {
    const subjectName = sanitizeCourseName(entry.subjectName);
    if (!subjectName) continue;
    await ensureCourse(userId, subjectName);
  }
}

function matchesCourseName(courseNormalizedName: string, subjectName: string) {
  return normalizeCourseName(subjectName) === courseNormalizedName;
}

export async function listCourses(userId: string) {
  await backfillFromTimetable(userId);

  return db.query.courses.findMany({
    where: eq(courses.userId, userId),
    orderBy: asc(courses.name)
  });
}

export async function getCourseDetail(userId: string, courseId: string) {
  await backfillFromTimetable(userId);

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.userId, userId))
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const timetableEntries = (await db.query.timetables.findMany({
    where: eq(timetables.userId, userId),
    orderBy: [asc(timetables.dayOfWeek), asc(timetables.startTime)]
  })).filter((entry) => matchesCourseName(course.normalizedName, entry.subjectName));

  const timetableIds = timetableEntries.map((entry) => entry.id);
  const notesForCourse =
    timetableIds.length === 0
      ? []
      : await db.query.notes.findMany({
          where: and(eq(notes.userId, userId), inArray(notes.timetableId, timetableIds)),
          orderBy: desc(notes.timestamp)
        });

  const timetableById = new Map(timetableEntries.map((entry) => [entry.id, entry]));
  const documents = await db.query.courseDocuments.findMany({
    where: and(eq(courseDocuments.userId, userId), eq(courseDocuments.courseId, courseId)),
    orderBy: desc(courseDocuments.createdAt)
  });

  return {
    course,
    timetableEntries,
    documents,
    notes: notesForCourse.map((note) => ({
      ...note,
      timetableEntry: timetableById.get(note.timetableId) ?? null
    }))
  };
}

export async function createCourse(userId: string, rawName: string) {
  const name = sanitizeCourseName(rawName);
  if (!name) {
    throw new AppError("Course name is required", 422);
  }

  const normalizedName = normalizeCourseName(name);

  const existing = await db.query.courses.findFirst({
    where: and(eq(courses.userId, userId), eq(courses.normalizedName, normalizedName))
  });

  if (existing) {
    return existing;
  }

  const inserted = await db
    .insert(courses)
    .values({
      id: crypto.randomUUID(),
      userId,
      name,
      normalizedName
    })
    .returning();

  return inserted[0];
}

export async function deleteCourse(userId: string, courseId: string) {
  const existing = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.userId, userId))
  });

  if (!existing) {
    throw new AppError("Course not found", 404);
  }

  await db.delete(courses).where(and(eq(courses.id, courseId), eq(courses.userId, userId)));
}
