import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, ClipboardList, ImageUp, LayoutDashboard, Loader2, NotebookTabs } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CurrentClassCard } from "../components/timetable/CurrentClassCard";
import { NextClassCard } from "../components/timetable/NextClassCard";
// import { TimetableEntryForm } from "../components/timetable/TimetableEntryForm"; // Removed for cleaner dashboard
import { TimetableList } from "../components/timetable/TimetableList";
import { NoteComposer } from "../components/notes/NoteComposer";
import {
  getGoogleClassroomDashboardSummary,
  getGoogleClassroomStatus,
  syncGoogleClassroom
} from "../features/google-classroom/api";
import { createNote, listNotes, summarizeNote } from "../features/notes/api";
import {
  getCurrentClass,
  importTimetableImage,
  listTimetableEntries
} from "../features/timetable/api";
import { DAYS_OF_WEEK } from "../types/domain";
import type { DayOfWeek, GoogleClassroomDashboardItem, TimetableEntry, TimetableImportResult } from "../types/domain";

const JS_DAY_TO_TIMETABLE_DAY: Record<number, DayOfWeek> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY"
};

function formatDayLabel(day: DayOfWeek) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

function formatDueTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTimingLabel(value: "due" | "posted") {
  return value === "due" ? "Due" : "Posted";
}

function DashboardMetric({
  label,
  value,
  icon: Icon,
  tone,
  active,
  onClick
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: "amber" | "slate" | "teal";
  active: boolean;
  onClick: () => void;
}) {
  const toneClasses =
    tone === "amber"
      ? "bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
      : tone === "slate"
        ? "bg-stone-100 text-slate-900 dark:bg-slate-800/80 dark:text-slate-100"
        : "bg-teal-50 text-teal-900 dark:bg-teal-950/30 dark:text-teal-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-left transition-all ${toneClasses} ${
        active ? "ring-2 ring-slate-900/15 dark:ring-white/20" : "opacity-85 hover:opacity-100"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </button>
  );
}

export function DashboardPage() {
  const { userId, userReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [lastImportResult, setLastImportResult] = useState<TimetableImportResult | null>(null);
  const [selectedAlertView, setSelectedAlertView] = useState<"all" | "assignments" | "quizzes">("all");

  const currentClassQuery = useQuery({
    queryKey: ["current-class", userId],
    queryFn: getCurrentClass,
    enabled: userReady,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  const timetableQuery = useQuery({
    queryKey: ["timetable", userId],
    queryFn: listTimetableEntries,
    enabled: userReady
  });

  const classroomStatusQuery = useQuery({
    queryKey: ["google-classroom-status", userId],
    queryFn: getGoogleClassroomStatus,
    enabled: userReady,
    refetchOnWindowFocus: false
  });

  const classroomDashboardQuery = useQuery({
    queryKey: ["google-classroom-dashboard-summary", userId],
    queryFn: getGoogleClassroomDashboardSummary,
    enabled: userReady,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true
  });

  const autoSyncGoogleClassroomMutation = useMutation({
    mutationFn: syncGoogleClassroom,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["google-classroom-status", userId] }),
        queryClient.invalidateQueries({ queryKey: ["google-classroom-dashboard-summary", userId] }),
        queryClient.invalidateQueries({ queryKey: ["google-classroom-materials", userId] }),
        queryClient.invalidateQueries({ queryKey: ["courses", userId] })
      ]);
    }
  });

  const notesQuery = useQuery({
    queryKey: ["notes", currentClassQuery.data?.id, userId],
    queryFn: () => listNotes(currentClassQuery.data!.id),
    enabled: Boolean(currentClassQuery.data?.id) && userReady
  });

  const createNoteMutation = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notes", currentClassQuery.data?.id, userId]
      });
      addToast("Note saved!", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to save note", "error");
    }
  });

  const summarizeMutation = useMutation({
    mutationFn: summarizeNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notes", currentClassQuery.data?.id, userId]
      });
      addToast("Summary generated!", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to generate summary", "error");
    }
  });

  const importTimetableMutation = useMutation({
    mutationFn: (file: File) => importTimetableImage(file),
    onSuccess: async (result) => {
      setLastImportResult(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timetable", userId] }),
        queryClient.invalidateQueries({ queryKey: ["current-class", userId] }),
        queryClient.invalidateQueries({ queryKey: ["courses", userId] })
      ]);

      if (result.insertedCount > 0) {
        addToast(
          `Imported ${result.insertedCount} class${result.insertedCount === 1 ? "" : "es"} from your timetable image.`,
          "success"
        );
        return;
      }

      addToast("No new classes were added. The image may have matched existing or conflicting slots.", "error");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to import timetable image", "error");
    }
  });

  function handleTimetableImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setLastImportResult(null);
    void importTimetableMutation.mutateAsync(file);
  }

  const dashboardUpdates = useMemo(() => {
    const data = classroomDashboardQuery.data;
    if (!data) {
      return {
        assignments: [] as GoogleClassroomDashboardItem[],
        quizzes: [] as GoogleClassroomDashboardItem[]
      };
    }

    return {
      assignments: data.upcomingAssignments,
      quizzes: data.upcomingQuizzes
    };
  }, [classroomDashboardQuery.data]);

  const selectedAlertItems = useMemo(() => {
    if (selectedAlertView === "assignments") {
      return dashboardUpdates.assignments;
    }

    if (selectedAlertView === "quizzes") {
      return dashboardUpdates.quizzes;
    }

    return [...dashboardUpdates.assignments, ...dashboardUpdates.quizzes].sort(
      (a, b) => new Date(a.displayAt).getTime() - new Date(b.displayAt).getTime()
    );
  }, [dashboardUpdates, selectedAlertView]);

  const upcomingCounts = useMemo(
    () => ({
      totalUpcomingCount: dashboardUpdates.assignments.length + dashboardUpdates.quizzes.length,
      assignmentsDueCount: dashboardUpdates.assignments.length,
      quizzesComingCount: dashboardUpdates.quizzes.length
    }),
    [dashboardUpdates]
  );

  const focusedSchedule = useMemo(() => {
    const entries = timetableQuery.data ?? [];
    if (entries.length === 0) {
      return {
        title: "Upcoming Schedule",
        description: "No classes scheduled yet.",
        entries: [] as TimetableEntry[]
      };
    }

    const now = new Date();
    const today = JS_DAY_TO_TIMETABLE_DAY[now.getDay()];
    const todayIndex = DAYS_OF_WEEK.indexOf(today);

    for (let offset = 0; offset < DAYS_OF_WEEK.length; offset += 1) {
      const day = DAYS_OF_WEEK[(todayIndex + offset) % DAYS_OF_WEEK.length]!;
      const dayEntries = entries
        .filter((entry) => entry.dayOfWeek === day)
        .sort((left, right) => left.startTime.localeCompare(right.startTime));

      if (dayEntries.length === 0) {
        continue;
      }

      return {
        title: offset === 0 ? "Today's Schedule" : `${formatDayLabel(day)} Schedule`,
        description:
          offset === 0
            ? `${dayEntries.length} ${dayEntries.length === 1 ? "class" : "classes"} scheduled today`
            : `${dayEntries.length} ${dayEntries.length === 1 ? "class" : "classes"} on the next scheduled day`,
        entries: dayEntries
      };
    }

    return {
      title: "Upcoming Schedule",
      description: "No classes scheduled yet.",
      entries: [] as TimetableEntry[]
    };
  }, [timetableQuery.data]);

  useEffect(() => {
    if (typeof window === "undefined" || !userReady) {
      return;
    }

    const status = classroomStatusQuery.data;
    if (!status?.connected || autoSyncGoogleClassroomMutation.isPending) {
      return;
    }

    const syncGuardKey = `google-classroom-auto-sync:${userId}`;
    if (window.sessionStorage.getItem(syncGuardKey) === "done") {
      return;
    }

    const lastSyncedAt = status.lastSyncedAt ? new Date(status.lastSyncedAt) : null;
    const shouldSync =
      !lastSyncedAt || Number.isNaN(lastSyncedAt.getTime()) || Date.now() - lastSyncedAt.getTime() > 10 * 60 * 1000;

    window.sessionStorage.setItem(syncGuardKey, "done");

    if (shouldSync) {
      void autoSyncGoogleClassroomMutation.mutateAsync();
    }
  }, [autoSyncGoogleClassroomMutation, classroomStatusQuery.data, userId, userReady]);

  return (
    <div className="space-y-8 stagger-children pb-10">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-2xl bg-teal-100 p-2.5 dark:bg-teal-950/40">
              <LayoutDashboard className="h-6 w-6 text-teal-900 dark:text-teal-100" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Dashboard
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-1">
            Your schedule, notes, and current session at a glance.
          </p>
        </div>
      </header>

      {/* Hero Section: Current & Next Class */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CurrentClassCard activeClass={currentClassQuery.data ?? null} />
        </div>
        <div className="lg:col-span-1 h-full">
          <NextClassCard entries={timetableQuery.data ?? []} />
        </div>
      </div>

      <section className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-100 p-2.5 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Upcoming Google Classroom Updates
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Upcoming assignments and quizzes from Google Classroom, synced automatically when you come back.
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/materials"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Open materials
          </Link>
        </div>

        {classroomDashboardQuery.isLoading ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
          </div>
        ) : classroomDashboardQuery.isError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
            {(classroomDashboardQuery.error as Error).message || "Could not load Google Classroom alerts."}
          </div>
        ) : !classroomDashboardQuery.data?.connected ? (
          <div className="mt-5 rounded-2xl border-2 border-dashed border-stone-300 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Connect Google Classroom from the Materials page to see due assignments, upcoming quizzes, and study help here.
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <DashboardMetric
                active={selectedAlertView === "all"}
                onClick={() => setSelectedAlertView("all")}
                label="All Upcoming"
                value={upcomingCounts.totalUpcomingCount}
                icon={BellRing}
                tone="slate"
              />
              <DashboardMetric
                active={selectedAlertView === "assignments"}
                onClick={() => setSelectedAlertView("assignments")}
                label="Assignments Due"
                value={upcomingCounts.assignmentsDueCount}
                icon={ClipboardList}
                tone="amber"
              />
              <DashboardMetric
                active={selectedAlertView === "quizzes"}
                onClick={() => setSelectedAlertView("quizzes")}
                label="Upcoming Quizzes"
                value={upcomingCounts.quizzesComingCount}
                icon={NotebookTabs}
                tone="teal"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {selectedAlertView === "assignments" ? (
                  <ClipboardList className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                ) : selectedAlertView === "quizzes" ? (
                  <NotebookTabs className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                ) : (
                  <BellRing className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                )}
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {selectedAlertView === "assignments"
                    ? "Upcoming Assignments"
                    : selectedAlertView === "quizzes"
                      ? "Upcoming Quizzes"
                      : "All Upcoming Updates"}
                </h3>
              </div>

              {selectedAlertItems.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  {selectedAlertView === "assignments"
                    ? "No upcoming assignments were found."
                    : selectedAlertView === "quizzes"
                      ? "No upcoming quizzes were found."
                      : "No upcoming Google Classroom updates were found."}
                </div>
              ) : (
                selectedAlertItems.map((item) => (
                  <div
                    key={`${selectedAlertView}-${item.materialId}`}
                    className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          {item.courseName ?? "Unknown subject"} • {formatTimingLabel(item.timingLabel)}{" "}
                          {formatDueTimestamp(item.displayAt)}
                        </p>
                      </div>
                      <Link
                        to={`/materials/${item.materialId}`}
                        className="inline-flex items-center rounded-xl border border-stone-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-2.5 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                <ImageUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Import timetable from an image
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Upload a clear screenshot or photo of your class schedule and the app will scan it into your timetable.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Best results come from cropped images with visible day labels, time ranges, and subject names.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600">
              {importTimetableMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageUp className="h-4 w-4" />
              )}
              {importTimetableMutation.isPending ? "Scanning image..." : "Choose timetable image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleTimetableImageSelection}
                disabled={importTimetableMutation.isPending}
              />
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              JPG, PNG, WEBP and similar image formats are supported.
            </span>
          </div>
        </div>

        {lastImportResult && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
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
                Conflicts
              </p>
              <p className="mt-1 text-2xl font-semibold text-rose-900 dark:text-rose-100">
                {lastImportResult.skippedConflictCount}
              </p>
            </div>

            {lastImportResult.inserted.length > 0 && (
              <div className="rounded-2xl border border-stone-200 px-4 py-3 md:col-span-2 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Added Classes
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
              <div className="rounded-2xl border border-rose-200 px-4 py-3 md:col-span-2 dark:border-rose-900/60">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
                  Skipped For Conflict
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

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Main Content Area: Notes taking takes precedence during class */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Class Notes</h2>
            <span className="rounded-full bg-stone-200/70 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Summaries available
            </span>
          </div>
          <NoteComposer
            activeClass={currentClassQuery.data ?? null}
            notes={notesQuery.data ?? []}
            onCreateNote={async ({ timetableId, content }) => {
              await createNoteMutation.mutateAsync({ timetableId, content });
            }}
            onSummarize={async (noteId) => {
              await summarizeMutation.mutateAsync(noteId);
            }}
          />
        </div>

        {/* Sidebar Area: Schedule */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{focusedSchedule.title}</h2>
          </div>
          {timetableQuery.isLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
            </div>
          ) : (
            <TimetableList
              entries={focusedSchedule.entries}
              title={focusedSchedule.title}
              description={focusedSchedule.description}
              onOpenNotes={(entry) => navigate(`/past-notes?timetableId=${entry.id}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
