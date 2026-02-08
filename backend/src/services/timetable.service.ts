import { Prisma, Timetable } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { getDayOfWeekEnum, toHHMM } from "../utils/time";

type CreateTimetableInput = {
  userId: string;
  dayOfWeek: Prisma.TimetableCreateInput["dayOfWeek"];
  startTime: string;
  endTime: string;
  subjectName: string;
};

export async function createTimetableEntry(input: CreateTimetableInput): Promise<Timetable> {
  if (input.startTime >= input.endTime) {
    throw new AppError("startTime must be before endTime", 422);
  }

  const overlap = await prisma.timetable.findFirst({
    where: {
      userId: input.userId,
      dayOfWeek: input.dayOfWeek,
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime }
    }
  });

  if (overlap) {
    throw new AppError("Timetable conflict: overlapping class already exists", 409);
  }

  return prisma.timetable.create({
    data: {
      userId: input.userId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      subjectName: input.subjectName.trim()
    }
  });
}

export async function listTimetableEntries(userId: string): Promise<Timetable[]> {
  return prisma.timetable.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
  });
}

export async function getCurrentActiveClass(
  userId: string,
  now: Date = new Date()
): Promise<Timetable | null> {
  const dayOfWeek = getDayOfWeekEnum(now);
  const currentTime = toHHMM(now);

  return prisma.timetable.findFirst({
    where: {
      userId,
      dayOfWeek,
      startTime: { lte: currentTime },
      endTime: { gt: currentTime }
    },
    orderBy: { startTime: "desc" }
  });
}
