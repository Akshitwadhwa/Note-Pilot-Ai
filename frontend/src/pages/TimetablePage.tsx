import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CalendarDays, BookOpen } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { TimetableEntryForm } from "../components/timetable/TimetableEntryForm";
import { TimetableList } from "../components/timetable/TimetableList";
import { createTimetableEntry, listTimetableEntries } from "../features/timetable/api";

export function TimetablePage() {
  const { userId, userReady, authReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const timetableQuery = useQuery({
    queryKey: ["timetable", userId],
    queryFn: listTimetableEntries,
    enabled: userReady
  });

  const createTimetableMutation = useMutation({
    mutationFn: createTimetableEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["timetable", userId] });
      await queryClient.invalidateQueries({ queryKey: ["current-class", userId] });
      addToast("Class added to timetable!", "success");
    },
    onError: (error) => {
      const errorMessage = axios.isAxiosError(error)
        ? ((error.response?.data as { error?: string } | undefined)?.error ??
          error.message ??
          "Failed to add entry")
        : (error as Error).message || "Failed to add entry";

      addToast(errorMessage, "error");
    }
  });

  const totalClasses = timetableQuery.data?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 stagger-children">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Timetable</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage your weekly class schedule
              </p>
            </div>
          </div>
        </div>

        {/* Stats chips */}
        {totalClasses > 0 && (
          <div className="flex gap-2 animate-fade-in">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
              <BookOpen className="h-3 w-3" />
              {totalClasses} {totalClasses === 1 ? "class" : "classes"}
            </div>
          </div>
        )}
      </div>

      {/* Add Class Form */}
      <TimetableEntryForm
        disabled={!userReady || !authReady || createTimetableMutation.isPending}
        onCreate={async (payload) => {
          await createTimetableMutation.mutateAsync(payload);
        }}
      />

      {/* Timetable List */}
      {timetableQuery.isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="skeleton h-20 w-full rounded-xl" />
            <div className="skeleton h-20 w-full rounded-xl" />
            <div className="skeleton h-20 w-full rounded-xl" />
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="skeleton h-20 w-full rounded-xl" />
            <div className="skeleton h-20 w-3/4 rounded-xl" />
          </div>
        </div>
      ) : (
        <TimetableList entries={timetableQuery.data ?? []} />
      )}
    </div>
  );
}
