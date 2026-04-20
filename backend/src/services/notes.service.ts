import { eq, and, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { notes, timetables } from "../lib/drizzle/schema";
import { AppError } from "../middleware/error.middleware";

export async function createNote(userId: string, timetableId: string, content: string, sessionDate: string) {
  const timetable = await db.query.timetables.findFirst({
    where: and(eq(timetables.id, timetableId), eq(timetables.userId, userId))
  });

  if (!timetable) {
    throw new AppError("Timetable entry not found for this user", 404);
  }

  const existingNote = await db.query.notes.findFirst({
    where: and(
      eq(notes.userId, userId),
      eq(notes.timetableId, timetableId),
      eq(notes.sessionDate, sessionDate)
    ),
    orderBy: desc(notes.timestamp)
  });

  if (existingNote) {
    const updated = await db
      .update(notes)
      .set({
        content,
        summary: null,
        updatedAt: new Date()
      })
      .where(eq(notes.id, existingNote.id))
      .returning();

    return updated[0];
  }

  const result = await db
    .insert(notes)
    .values({
      id: crypto.randomUUID(),
      userId,
      timetableId,
      sessionDate,
      content
    })
    .returning();

  return result[0];
}

export async function listNotesByTimetable(userId: string, timetableId: string, sessionDate?: string) {
  return db.query.notes.findMany({
    where: and(
      eq(notes.userId, userId),
      eq(notes.timetableId, timetableId),
      ...(sessionDate ? [eq(notes.sessionDate, sessionDate)] : [])
    ),
    orderBy: [desc(notes.sessionDate), desc(notes.timestamp)]
  });
}

export async function getNoteById(noteId: string) {
  return db.query.notes.findFirst({
    where: eq(notes.id, noteId)
  });
}

export async function getNoteByIdForUser(userId: string, noteId: string) {
  return db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId))
  });
}

export async function updateNoteContent(userId: string, noteId: string, content: string) {
  const note = await getNoteByIdForUser(userId, noteId);

  if (!note) {
    throw new AppError("Note not found", 404);
  }

  const result = await db
    .update(notes)
    .set({
      content,
      summary: null,
      updatedAt: new Date()
    })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .returning();

  return result[0];
}

export async function updateNoteSummary(noteId: string, summary: string) {
  const note = await db.query.notes.findFirst({
    where: eq(notes.id, noteId)
  });

  if (!note) {
    throw new AppError("Note not found", 404);
  }

  const result = await db
    .update(notes)
    .set({ summary, updatedAt: new Date() })
    .where(eq(notes.id, noteId))
    .returning();

  return result[0];
}
