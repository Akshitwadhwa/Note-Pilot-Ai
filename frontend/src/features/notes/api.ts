import { apiClient } from "../../lib/api-client";
import type { Note } from "../../types/domain";

type CreateNoteInput = {
  timetableId: string;
  content: string;
};

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const { data } = await apiClient.post<{ success: boolean; data: Note }>("/notes", input);
  return data.data;
}

export async function listNotes(timetableId: string): Promise<Note[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Note[] }>("/notes", {
    params: { timetableId }
  });
  return data.data;
}

export async function summarizeNote(noteId: string): Promise<{ noteId: string; summary: string }> {
  const { data } = await apiClient.post<{ success: boolean; data: { noteId: string; summary: string } }>(
    "/ai/summarize-note",
    { noteId }
  );
  return data.data;
}
