import { z } from "zod";

export const createNoteSchema = z.object({
  timetableId: z.string().min(1),
  content: z.string().min(1).max(10000)
});

export const summarizeTextSchema = z.object({
  text: z.string().min(1).max(20000)
});

export const summarizeNoteSchema = z.object({
  noteId: z.string().min(1)
});
