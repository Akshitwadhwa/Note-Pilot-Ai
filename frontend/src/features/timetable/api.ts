import { apiClient } from "../../lib/api-client";
import type { DayOfWeek, TimetableEntry } from "../../types/domain";

type CreateTimetableInput = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectName: string;
};

export async function createTimetableEntry(input: CreateTimetableInput): Promise<TimetableEntry> {
  const { data } = await apiClient.post<{ success: boolean; data: TimetableEntry }>("/timetable", input);
  return data.data;
}

export async function getCurrentClass(): Promise<TimetableEntry | null> {
  const { data } = await apiClient.get<{ success: boolean; data: TimetableEntry | null }>("/timetable/current");
  return data.data;
}

export async function listTimetableEntries(): Promise<TimetableEntry[]> {
  const { data } = await apiClient.get<{ success: boolean; data: TimetableEntry[] }>("/timetable");
  return data.data;
}
