import { apiClient } from "../../lib/api-client";
import type { Note } from "../../types/domain";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type CreateNoteInput = {
  timetableId: string;
  content: string;
};

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const response = await apiClient.post<ApiResponse<Note>>("/notes", input);
  return response.data.data;
}

export async function listNotes(timetableId: string): Promise<Note[]> {
  const response = await apiClient.get<ApiResponse<Note[]>>("/notes", {
    params: { timetableId }
  });
  return response.data.data;
}

export async function summarizeNote(noteId: string): Promise<{ noteId: string; summary: string }> {
  const response = await apiClient.post<ApiResponse<{ noteId: string; summary: string }>>(
    "/ai/summarize-note",
    { noteId }
  );
  return response.data.data;
}
