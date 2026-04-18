import { useEffect, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { BookOpen, CalendarDays, ImageUp, Loader2, PencilLine } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { TimetableEntryForm } from "../components/timetable/TimetableEntryForm";
import { TimetableList } from "../components/timetable/TimetableList";
import {
  createTimetableEntry,
  deleteTimetableEntry,
  importTimetableImage,
  listTimetableEntries,
  updateTimetableEntry
} from "../features/timetable/api";
import type { TimetableEntry, TimetableImportResult } from "../types/domain";

export function TimetablePage() {
  const { userId, userReady, authReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [replaceOnImport, setReplaceOnImport] = useState(true);
  const [lastImportResult, setLastImportResult] = useState<TimetableImportResult | null>(null);

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

  const importTimetableMutation = useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: "merge" | "replace" }) => importTimetableImage(file, { mode }),
    onSuccess: async (result) => {
      setLastImportResult(result);
      setSelectedEntry(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timetable", userId] }),
        queryClient.invalidateQueries({ queryKey: ["current-class", userId] }),
        queryClient.invalidateQueries({ queryKey: ["courses", userId] })
      ]);

      if (result.insertedCount > 0) {
        const replacedLabel =
          result.mode === "replace" && result.removedExistingCount > 0
            ? ` Replaced ${result.removedExistingCount} existing class${result.removedExistingCount === 1 ? "" : "es"}.`
            : "";
        addToast(
          `Imported ${result.insertedCount} class${result.insertedCount === 1 ? "" : "es"} into your timetable.${replacedLabel}`,
          "success"
        );
        return;
      }

      addToast("No new classes were added from the timetable image.", "error");
    },
    onError: (error) => {
      addToast(getErrorMessage(error, "Failed to import timetable image"), "error");
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

  function handleTimetableImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setLastImportResult(null);
    void importTimetableMutation.mutateAsync({
      file,
      mode: replaceOnImport ? "replace" : "merge"
    });
  }

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

      <section className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-6 shadow-[var(--app-shadow)] dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                <ImageUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Scan Timetable Image</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload a full screenshot or photo of your weekly schedule and write it directly into the timetable.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Use <span className="font-semibold">Replace current timetable</span> for a full weekly scan. Use merge only
              when you are adding a few missing classes to what is already there.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-teal-700 dark:hover:bg-teal-600">
              {importTimetableMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageUp className="h-4 w-4" />
              )}
              {importTimetableMutation.isPending ? "Scanning image..." : "Upload timetable image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleTimetableImageSelection}
                disabled={importTimetableMutation.isPending}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={replaceOnImport}
                onChange={(event) => setReplaceOnImport(event.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-teal-700 focus:ring-teal-600 dark:border-slate-600 dark:bg-slate-800"
                disabled={importTimetableMutation.isPending}
              />
              Replace current timetable
            </label>
          </div>
        </div>

        {lastImportResult && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-5">
              <div className="rounded-2xl bg-stone-100 px-4 py-3 dark:bg-slate-800/80">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Detected
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {lastImportResult.extractedCount}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  Added
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
                  {lastImportResult.insertedCount}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 dark:bg-sky-950/30">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                  Replaced
                </p>
                <p className="mt-1 text-2xl font-semibold text-sky-900 dark:text-sky-100">
                  {lastImportResult.removedExistingCount}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  Duplicates
                </p>
                <p className="mt-1 text-2xl font-semibold text-amber-900 dark:text-amber-100">
                  {lastImportResult.skippedDuplicateCount}
                </p>
              </div>
              <div className="rounded-2xl bg-rose-50 px-4 py-3 dark:bg-rose-950/30">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
                  Final Total
                </p>
                <p className="mt-1 text-2xl font-semibold text-rose-900 dark:text-rose-100">
                  {lastImportResult.finalCount}
                </p>
              </div>
            </div>

            {lastImportResult.inserted.length > 0 && (
              <div className="rounded-2xl border border-stone-200 px-4 py-3 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Imported Classes
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lastImportResult.inserted.map((entry) => (
                    <span
                      key={entry.id}
                      className="rounded-full bg-stone-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {entry.subjectName} · {entry.dayOfWeek.slice(0, 3)} · {entry.startTime}-{entry.endTime}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {lastImportResult.skippedConflicts.length > 0 && (
              <div className="rounded-2xl border border-rose-200 px-4 py-3 dark:border-rose-900/60">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
                  Conflicts Skipped
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lastImportResult.skippedConflicts.map((entry) => (
                    <span
                      key={`${entry.dayOfWeek}-${entry.startTime}-${entry.endTime}-${entry.subjectName}`}
                      className="rounded-full bg-rose-50 px-3 py-1 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                    >
                      {entry.subjectName} · {entry.dayOfWeek.slice(0, 3)} · {entry.startTime}-{entry.endTime}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

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
            Use Edit on any class card below to update the timetable. Clicking the class card itself opens that class in past notes.
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
          onOpenNotes={(entry) => navigate(`/past-notes?timetableId=${entry.id}`)}
          onEdit={(entry) => setSelectedEntry(entry)}
          onDelete={(entry) => {
            void deleteTimetableMutation.mutateAsync(entry.id);
          }}
        />
      )}
    </div>
  );
}
