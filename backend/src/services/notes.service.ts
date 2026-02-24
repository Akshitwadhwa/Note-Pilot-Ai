import { eq, and, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { notes, timetables } from "../lib/drizzle/schema";
import { AppError } from "../middleware/error.middleware";

export async function createNote(userId: string, timetableId: string, content: string) {
  const timetable = await db.query.timetables.findFirst({
    where: and(eq(timetables.id, timetableId), eq(timetables.userId, userId))
  });

  if (!timetable) {
    throw new AppError("Timetable entry not found for this user", 404);
  }

  const result = await db
    .insert(notes)
    .values({
      id: crypto.randomUUID(),
      userId,
      timetableId,
      content
    })
    .returning();

  return result[0];
}

export async function listNotesByTimetable(userId: string, timetableId: string) {
  return db.query.notes.findMany({
    where: and(eq(notes.userId, userId), eq(notes.timetableId, timetableId)),
    orderBy: desc(notes.timestamp)
  });
}

export async function getNoteById(noteId: string) {
  return db.query.notes.findFirst({
    where: eq(notes.id, noteId)
  });
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
    .set({ summary })
    .where(eq(notes.id, noteId))
    .returning();

  return result[0];
}
