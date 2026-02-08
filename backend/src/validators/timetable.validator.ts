import { DayOfWeek } from "@prisma/client";
import { z } from "zod";

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createTimetableSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek),
  startTime: z.string().regex(hhmmRegex, "startTime must be HH:mm"),
  endTime: z.string().regex(hhmmRegex, "endTime must be HH:mm"),
  subjectName: z.string().min(1).max(120)
});

export const currentClassQuerySchema = z.object({
  userId: z.string().min(1).optional()
});
