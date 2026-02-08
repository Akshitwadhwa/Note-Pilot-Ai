import { NextFunction, Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import {
  createTimetableEntry,
  getCurrentActiveClass,
  listTimetableEntries
} from "../services/timetable.service";

export async function createTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const entry = await createTimetableEntry({
      userId,
      dayOfWeek: req.body.dayOfWeek,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      subjectName: req.body.subjectName
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentClass(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req.query.userId as string) || req.user?.id;
    if (!userId) {
      throw new AppError("userId is required", 422);
    }

    const activeClass = await getCurrentActiveClass(userId);

    res.json({
      success: true,
      data: activeClass,
      message: activeClass ? "Active class found" : "No active class right now"
    });
  } catch (error) {
    next(error);
  }
}

export async function listTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const entries = await listTimetableEntries(userId);
    res.json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
}
