import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "../lib/db";
import { courseDocuments, courses, googleClassroomMaterials, notes, timetables } from "../lib/drizzle/schema";
import { AppError } from "../middleware/error.middleware";

function normalizeCourseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function sanitizeCourseName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function isMissingRelationError(error: unknown) {
  const candidate = error as { code?: string } | undefined;
  return candidate?.code === "42P01";
}

async function listGoogleClassroomMaterialsSafe(userId: string) {
  try {
    return await db.query.googleClassroomMaterials.findMany({
      where: eq(googleClassroomMaterials.userId, userId),
      orderBy: [desc(googleClassroomMaterials.publishedAt), desc(googleClassroomMaterials.createdAt)]
    });
  } catch (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }
}

export async function ensureCourse(userId: string, rawName: string) {
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

async function backfillFromGoogleClassroomMaterials(userId: string) {
  const materials = await listGoogleClassroomMaterialsSafe(userId);

  for (const material of materials) {
    const courseName = sanitizeCourseName(material.courseName ?? "");
    if (!courseName) continue;
    await ensureCourse(userId, courseName);
  }
}

function matchesCourseName(courseNormalizedName: string, subjectName: string) {
  return normalizeCourseName(subjectName) === courseNormalizedName;
}

export async function listCourses(userId: string) {
  await backfillFromTimetable(userId);
  await backfillFromGoogleClassroomMaterials(userId);

  return db.query.courses.findMany({
    where: eq(courses.userId, userId),
    orderBy: asc(courses.name)
  });
}

export async function getCourseDetail(userId: string, courseId: string) {
  await backfillFromTimetable(userId);
  await backfillFromGoogleClassroomMaterials(userId);

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

  const syncedGoogleMaterials = (await listGoogleClassroomMaterialsSafe(userId)).filter((material) =>
    matchesCourseName(course.normalizedName, material.courseName ?? "")
  );

  return {
    course,
    timetableEntries,
    documents,
    googleClassroomMaterials: syncedGoogleMaterials,
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
