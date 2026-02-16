import { apiClient } from "../../lib/api-client";
import type { DayOfWeek, TimetableEntry } from "../../types/domain";

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

export async function getCurrentClass(): Promise<TimetableEntry | null> {
  const response = await apiClient.get<ApiResponse<TimetableEntry | null>>("/timetable/current");
  return response.data.data ?? null;
}

export async function listTimetableEntries(): Promise<TimetableEntry[]> {
  const response = await apiClient.get<ApiResponse<TimetableEntry[]>>("/timetable");
  return response.data.data;
}
