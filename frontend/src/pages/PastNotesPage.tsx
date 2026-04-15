import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  History,
  FileText,
  CalendarDays,
  Clock,
  BookOpen,
  Save,
  Sparkles,
  Search,
} from "lucide-react";
import clsx from "clsx";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { listTimetableEntries } from "../features/timetable/api";
import { createNote, listNotes, summarizeNote } from "../features/notes/api";
import type { TimetableEntry, Note, DayOfWeek } from "../types/domain";

const DAY_COLORS: Record<DayOfWeek, { bg: string; text: string; dot: string }> = {
  MONDAY: { bg: "bg-sky-100 dark:bg-sky-900/40", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  TUESDAY: { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  WEDNESDAY: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  THURSDAY: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  FRIDAY: { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  SATURDAY: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  SUNDAY: { bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
};

function formatDay(day: string): string {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

export function PastNotesPage() {
  const { userId, userReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all timetable entries
  const timetableQuery = useQuery({
    queryKey: ["timetable", userId],
    queryFn: listTimetableEntries,
    enabled: userReady,
  });

  // Fetch notes for selected entry
  const notesQuery = useQuery({
    queryKey: ["notes", selectedEntry?.id, userId],
    queryFn: () => listNotes(selectedEntry!.id),
    enabled: Boolean(selectedEntry?.id) && userReady,
  });

  const createNoteMutation = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notes", selectedEntry?.id, userId],
      });
      addToast("Note saved!", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to save note", "error");
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: summarizeNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notes", selectedEntry?.id, userId],
      });
      addToast("Summary generated!", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to generate summary", "error");
    },
  });

  const entries = timetableQuery.data ?? [];
  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.dayOfWeek.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  async function handleSaveNote() {
    if (!selectedEntry || !noteContent.trim()) return;
    await createNoteMutation.mutateAsync({
      timetableId: selectedEntry.id,
      content: noteContent.trim(),
    });
    setNoteContent("");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 stagger-children">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
            <History className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Past Class Notes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Add notes and summaries for any class in your timetable
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Class Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/80">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-4 w-4" />
              Select a Class
            </h2>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400"
              />
            </div>

            {/* Class list */}
            {timetableQuery.isLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-14 w-full rounded-xl" />
                <div className="skeleton h-14 w-full rounded-xl" />
                <div className="skeleton h-14 w-full rounded-xl" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <BookOpen className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {entries.length === 0
                    ? "No classes in your timetable yet"
                    : "No classes match your search"}
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                {filteredEntries.map((entry) => {
                  const colors = DAY_COLORS[entry.dayOfWeek];
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setNoteContent("");
                      }}
                      className={clsx(
                        "w-full rounded-xl border p-3 text-left transition-all duration-200",
                        isSelected
                          ? "border-sky-500/50 bg-sky-50 shadow-sm dark:border-sky-500/30 dark:bg-sky-950/30"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={clsx("h-2 w-2 rounded-full flex-shrink-0", colors.dot)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {entry.subjectName}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className={clsx("font-medium", colors.text)}>
                              {formatDay(entry.dayOfWeek)}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span>{entry.startTime} – {entry.endTime}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Notes Area */}
        <div className="lg:col-span-8 space-y-5">
          {!selectedEntry ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                Select a class to view or add notes
              </p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Pick any class from your timetable on the left
              </p>
            </div>
          ) : (
            <>
              {/* Selected class info */}
              <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-sky-50/30 p-5 shadow-sm dark:border-slate-800/60 dark:from-slate-900/80 dark:via-slate-900/80 dark:to-sky-950/10">
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      DAY_COLORS[selectedEntry.dayOfWeek].bg
                    )}
                  >
                    <BookOpen
                      className={clsx("h-5 w-5", DAY_COLORS[selectedEntry.dayOfWeek].text)}
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {selectedEntry.subjectName}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <CalendarDays className="h-3 w-3" />
                      <span>{formatDay(selectedEntry.dayOfWeek)}</span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <Clock className="h-3 w-3" />
                      <span>
                        {selectedEntry.startTime} – {selectedEntry.endTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note composer */}
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/80">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-sky-500" />
                  Add Note
                </h3>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  placeholder={`Write notes for ${selectedEntry.subjectName}...`}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleSaveNote()}
                    disabled={
                      !noteContent.trim() || createNoteMutation.isPending
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-emerald-400 hover:to-teal-400 hover:shadow-lg active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {createNoteMutation.isPending ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </div>

              {/* Existing notes */}
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/80">
                <h3 className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <History className="h-4 w-4 text-amber-500" />
                    Saved Notes
                  </span>
                  {notesQuery.data && notesQuery.data.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {notesQuery.data.length}
                    </span>
                  )}
                </h3>

                {notesQuery.isLoading ? (
                  <div className="space-y-3">
                    <div className="skeleton h-20 w-full rounded-xl" />
                    <div className="skeleton h-20 w-full rounded-xl" />
                  </div>
                ) : !notesQuery.data || notesQuery.data.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <FileText className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No notes yet for this class
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notesQuery.data.map((note: Note) => (
                      <article
                        key={note.id}
                        className="rounded-xl border border-slate-200/60 p-4 transition-colors hover:border-slate-300 dark:border-slate-700/60 dark:hover:border-slate-600"
                      >
                        <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-300">
                          {note.content}
                        </p>
                        {note.timestamp && (
                          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                            {new Date(note.timestamp).toLocaleString()}
                          </p>
                        )}
                        {note.summary ? (
                          <div className="mt-3 flex gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/50">
                            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-sm text-emerald-900 dark:text-emerald-200">
                              {note.summary}
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void summarizeMutation.mutateAsync(note.id)}
                            disabled={summarizeMutation.isPending}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:from-sky-400 hover:to-indigo-400 hover:shadow-md active:scale-[0.97] disabled:opacity-50"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {summarizeMutation.isPending
                              ? "Generating..."
                              : "Generate AI Summary"}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
