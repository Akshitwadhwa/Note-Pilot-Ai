import { NextFunction, Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import { createNote, listNotesByTimetable } from "../services/notes.service";

export async function createNoteController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const note = await createNote(userId, req.body.timetableId, req.body.content);
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
}

export async function listNotesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const timetableId = req.query.timetableId as string;
    if (!timetableId) {
      throw new AppError("timetableId query param is required", 422);
    }

    const notes = await listNotesByTimetable(userId, timetableId);
    res.json({ success: true, data: notes });
  } catch (error) {
    next(error);
  }
}
