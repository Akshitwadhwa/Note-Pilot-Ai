import { NextFunction, Request, Response } from "express";

import { summarizeNoteById, summarizeText } from "../services/ai.service";

export async function summarizeTextController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const summary = await summarizeText(req.body.text);
    res.json({ success: true, data: { summary } });
  } catch (error) {
    next(error);
  }
}

export async function summarizeNoteController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await summarizeNoteById(req.body.noteId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
