import { Note } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";

export async function createNote(userId: string, timetableId: string, content: string): Promise<Note> {
  const timetable = await prisma.timetable.findFirst({
    where: { id: timetableId, userId }
  });

  if (!timetable) {
    throw new AppError("Timetable entry not found for this user", 404);
  }

  return prisma.note.create({
    data: {
      userId,
      timetableId,
      content
    }
  });
}

export async function listNotesByTimetable(userId: string, timetableId: string): Promise<Note[]> {
  return prisma.note.findMany({
    where: {
      userId,
      timetableId
    },
    orderBy: {
      timestamp: "desc"
    }
  });
}

export async function updateNoteSummary(noteId: string, summary: string): Promise<Note> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });

  if (!note) {
    throw new AppError("Note not found", 404);
  }

  return prisma.note.update({
    where: { id: noteId },
    data: { summary }
  });
}

export async function getNoteById(noteId: string): Promise<Note | null> {
  return prisma.note.findUnique({ where: { id: noteId } });
}
