import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CalendarDays, BookOpen, PencilLine } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { TimetableEntryForm } from "../components/timetable/TimetableEntryForm";
import { TimetableList } from "../components/timetable/TimetableList";
import {
  createTimetableEntry,
  deleteTimetableEntry,
  listTimetableEntries,
  updateTimetableEntry
} from "../features/timetable/api";
import type { TimetableEntry } from "../types/domain";

export function TimetablePage() {
  const { userId, userReady, authReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);

  function getErrorMessage(error: unknown, fallback: string) {
    return axios.isAxiosError(error)
      ? ((error.response?.data as { error?: string } | undefined)?.error ?? error.message ?? fallback)
      : (error as Error).message || fallback;
  }

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
      addToast(getErrorMessage(error, "Failed to add entry"), "error");
    }
  });

  const updateTimetableMutation = useMutation({
    mutationFn: ({ timetableId, payload }: { timetableId: string; payload: Omit<TimetableEntry, "id" | "userId"> }) =>
      updateTimetableEntry(timetableId, payload),
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: ["timetable", userId] });
      await queryClient.invalidateQueries({ queryKey: ["current-class", userId] });
      setSelectedEntry(entry);
      addToast("Timetable updated", "success");
    },
    onError: (error) => {
      addToast(getErrorMessage(error, "Failed to update entry"), "error");
    }
  });

  const deleteTimetableMutation = useMutation({
    mutationFn: deleteTimetableEntry,
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: ["timetable", userId] });
      await queryClient.invalidateQueries({ queryKey: ["current-class", userId] });
      if (selectedEntry?.id === entry.id) {
        setSelectedEntry(null);
      }
      addToast("Class removed from timetable", "success");
    },
    onError: (error) => {
      addToast(getErrorMessage(error, "Failed to delete entry"), "error");
    }
  });

  const totalClasses = timetableQuery.data?.length ?? 0;

  useEffect(() => {
    const entries = timetableQuery.data ?? [];

    if (!selectedEntry) {
      return;
    }

    const refreshedEntry = entries.find((entry) => entry.id === selectedEntry.id) ?? null;
    setSelectedEntry(refreshedEntry);
  }, [selectedEntry?.id, timetableQuery.data]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 stagger-children">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-[0_20px_36px_-28px_rgba(15,23,42,0.9)] dark:bg-teal-900">
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
            <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-200/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
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

      <section className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-6 shadow-[var(--app-shadow)] dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
            <PencilLine className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Timetable</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pick a class from the weekly schedule below to adjust its day, time, or subject.
            </p>
          </div>
        </div>

        {selectedEntry ? (
          <TimetableEntryForm
            mode="edit"
            title={`Editing ${selectedEntry.subjectName}`}
            description="Update the selected class details and save them back to your timetable."
            submitLabel={updateTimetableMutation.isPending ? "Saving..." : "Save Changes"}
            initialValues={selectedEntry}
            disabled={!userReady || !authReady || updateTimetableMutation.isPending}
            onCancel={() => setSelectedEntry(null)}
            onCreate={async (payload) => {
              await updateTimetableMutation.mutateAsync({
                timetableId: selectedEntry.id,
                payload
              });
            }}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Select any class card below to open it in the editor.
          </div>
        )}
      </section>

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
        <TimetableList
          entries={timetableQuery.data ?? []}
          selectedEntryId={selectedEntry?.id ?? null}
          onEdit={(entry) => setSelectedEntry(entry)}
          onDelete={(entry) => {
            void deleteTimetableMutation.mutateAsync(entry.id);
          }}
        />
      )}
    </div>
  );
}
