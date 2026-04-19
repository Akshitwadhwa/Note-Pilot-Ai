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

export async function updateNote(noteId: string, content: string): Promise<Note> {
  const response = await apiClient.put<ApiResponse<Note>>(`/notes/${noteId}`, { content });
  return response.data.data;
}

export async function assistText(text: string, question: string): Promise<{ answer: string }> {
  const response = await apiClient.post<ApiResponse<{ answer: string }>>("/ai/assist-text", {
    text,
    question
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

export async function assistNote(noteId: string, question: string): Promise<{ noteId: string; answer: string }> {
  const response = await apiClient.post<ApiResponse<{ noteId: string; answer: string }>>("/ai/assist-note", {
    noteId,
    question
  });
  return response.data.data;
}
