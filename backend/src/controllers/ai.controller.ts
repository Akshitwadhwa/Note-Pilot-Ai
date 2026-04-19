import { NextFunction, Request, Response } from "express";

import { askAIAboutNote, askAIAboutText, summarizeNoteById, summarizeText } from "../services/ai.service";

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

export async function assistTextController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await askAIAboutText(req.body.text, req.body.question);
    res.json({ success: true, data: result });
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

export async function assistNoteController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const result = await askAIAboutNote(userId, req.body.noteId, req.body.question);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
