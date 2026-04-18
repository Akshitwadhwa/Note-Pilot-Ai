import { apiClient } from "../../lib/api-client";
import type { DayOfWeek, TimetableEntry, TimetableImportResult } from "../../types/domain";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type CreateTimetableInput = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectName: string;
};

export async function createTimetableEntry(input: CreateTimetableInput): Promise<TimetableEntry> {
  const response = await apiClient.post<ApiResponse<TimetableEntry>>("/timetable", input);
  return response.data.data;
}

export async function updateTimetableEntry(
  timetableId: string,
  input: CreateTimetableInput
): Promise<TimetableEntry> {
  const response = await apiClient.put<ApiResponse<TimetableEntry>>(`/timetable/${timetableId}`, input);
  return response.data.data;
}

export async function deleteTimetableEntry(timetableId: string): Promise<TimetableEntry> {
  const response = await apiClient.delete<ApiResponse<TimetableEntry>>(`/timetable/${timetableId}`);
  return response.data.data;
}

export async function getCurrentClass(): Promise<TimetableEntry | null> {
  const response = await apiClient.get<ApiResponse<TimetableEntry | null>>("/timetable/current");
  return response.data.data ?? null;
}

export async function listTimetableEntries(): Promise<TimetableEntry[]> {
  const response = await apiClient.get<ApiResponse<TimetableEntry[]>>("/timetable");
  return response.data.data;
}

export async function importTimetableImage(
  file: File,
  options?: { mode?: "merge" | "replace" }
): Promise<TimetableImportResult> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("mode", options?.mode === "replace" ? "replace" : "merge");

  const response = await apiClient.post<ApiResponse<TimetableImportResult>>(
    "/timetable/import-image",
    formData
  );

  return response.data.data;
}
