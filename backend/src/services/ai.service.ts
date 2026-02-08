import OpenAI from "openai";

import { env } from "../config/env";
import { AppError } from "../middleware/error.middleware";
import { getNoteById, updateNoteSummary } from "./notes.service";

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

export async function summarizeText(text: string): Promise<string> {
  if (!openai) {
    throw new AppError("OPENAI_API_KEY is not configured", 500);
  }

  const response = await openai.chat.completions.create({
    model: env.openaiModel,
    messages: [
      {
        role: "system",
        content:
          "You summarize student class notes into concise bullet points with action items and key terms."
      },
      {
        role: "user",
        content: `Summarize these notes:\n\n${text}`
      }
    ],
    temperature: 0.2
  });

  const summary = response.choices[0]?.message?.content?.trim();

  if (!summary) {
    throw new AppError("Model returned an empty summary", 502);
  }

  return summary;
}

export async function summarizeNoteById(noteId: string): Promise<{ noteId: string; summary: string }> {
  const note = await getNoteById(noteId);

  if (!note) {
    throw new AppError("Note not found", 404);
  }

  const summary = await summarizeText(note.content);
  await updateNoteSummary(noteId, summary);

  return { noteId, summary };
}
