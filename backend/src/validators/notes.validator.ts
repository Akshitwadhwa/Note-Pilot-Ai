import { z } from "zod";

export const createNoteSchema = z.object({
  timetableId: z.string().min(1),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().min(1).max(10000)
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(10000)
});

export const noteParamsSchema = z.object({
  noteId: z.string().min(1)
});

export const summarizeTextSchema = z.object({
  text: z.string().min(1).max(20000)
});

export const assistTextSchema = z.object({
  text: z.string().min(1).max(20000),
  question: z.string().trim().min(1).max(2000)
});

export const summarizeNoteSchema = z.object({
  noteId: z.string().min(1)
});

export const assistNoteSchema = z.object({
  noteId: z.string().min(1),
  question: z.string().trim().min(1).max(2000)
});
