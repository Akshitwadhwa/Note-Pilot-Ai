import { useEffect, useState } from "react";
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
  X,
} from "lucide-react";
import clsx from "clsx";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { listTimetableEntries } from "../features/timetable/api";
import { assistNote, createNote, listNotes, summarizeNote, updateNote } from "../features/notes/api";
import type { TimetableEntry, Note, DayOfWeek } from "../types/domain";

const DAY_COLORS: Record<DayOfWeek, { bg: string; text: string; dot: string }> = {
  MONDAY: { bg: "bg-teal-100 dark:bg-teal-950/40", text: "text-teal-800 dark:text-teal-200", dot: "bg-teal-600" },
  TUESDAY: { bg: "bg-cyan-100 dark:bg-cyan-950/40", text: "text-cyan-800 dark:text-cyan-200", dot: "bg-cyan-600" },
  WEDNESDAY: { bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-200", dot: "bg-amber-500" },
  THURSDAY: { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-600" },
  FRIDAY: { bg: "bg-rose-100 dark:bg-rose-950/40", text: "text-rose-800 dark:text-rose-200", dot: "bg-rose-500" },
  SATURDAY: { bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-800 dark:text-orange-200", dot: "bg-orange-500" },
  SUNDAY: { bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
};

function formatDay(day: string): string {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

export function PastNotesPage() {
  const { userId, userReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNoteDraft, setSelectedNoteDraft] = useState("");
  const [showAIBox, setShowAIBox] = useState(false);
  const [aiQuestion, setAIQuestion] = useState("");
  const [aiAnswer, setAIAnswer] = useState("");

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

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) => updateNote(noteId, content),
    onSuccess: async (updatedNote) => {
      setSelectedNote(updatedNote);
      setSelectedNoteDraft(updatedNote.content);
      await queryClient.invalidateQueries({
        queryKey: ["notes", selectedEntry?.id, userId],
      });
      addToast("Note updated!", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to update note", "error");
    },
  });

  const assistNoteMutation = useMutation({
    mutationFn: ({ noteId, question }: { noteId: string; question: string }) => assistNote(noteId, question),
    onSuccess: (result) => {
      setAIAnswer(result.answer);
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to ask AI about this note", "error");
    },
  });

  const entries = timetableQuery.data ?? [];
  const preselectedEntryId = searchParams.get("timetableId");
  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.dayOfWeek.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  useEffect(() => {
    if (entries.length === 0) {
      if (selectedEntry) {
        setSelectedEntry(null);
      }
      return;
    }

    if (preselectedEntryId) {
      const matchedEntry = entries.find((entry) => entry.id === preselectedEntryId) ?? null;
      if (matchedEntry) {
        if (selectedEntry?.id !== matchedEntry.id) {
          setSelectedEntry(matchedEntry);
          setNoteContent("");
        }
        return;
      }
    }

    if (!selectedEntry) {
      return;
    }

    const refreshedEntry = entries.find((entry) => entry.id === selectedEntry.id) ?? null;
    if (refreshedEntry?.id !== selectedEntry.id) {
      setSelectedEntry(refreshedEntry);
    }
  }, [entries, preselectedEntryId, selectedEntry, setNoteContent]);

  useEffect(() => {
    const notes = notesQuery.data ?? [];

    if (!selectedEntry) {
      if (selectedNote) {
        setSelectedNote(null);
      }
      setSelectedNoteDraft("");
      setShowAIBox(false);
      setAIQuestion("");
      setAIAnswer("");
      return;
    }

    if (notes.length === 0) {
      if (selectedNote) {
        setSelectedNote(null);
      }
      setSelectedNoteDraft("");
      return;
    }

    if (!selectedNote) return;

    const refreshedNote = notes.find((note) => note.id === selectedNote.id) ?? null;
    if (!refreshedNote) {
      setSelectedNote(null);
      return;
    }

    if (
      refreshedNote.content !== selectedNote.content ||
      refreshedNote.summary !== selectedNote.summary ||
      refreshedNote.timestamp !== selectedNote.timestamp
    ) {
      setSelectedNote(refreshedNote);
    }
  }, [notesQuery.data, selectedEntry, selectedNote]);

  useEffect(() => {
    setSelectedNoteDraft(selectedNote?.content ?? "");
    setShowAIBox(false);
    setAIQuestion("");
    setAIAnswer("");
  }, [selectedNote?.id]);

  function handleSelectEntry(entry: TimetableEntry) {
    setSelectedEntry(entry);
    setSelectedNote(null);
    setNoteContent("");
    setSearchParams({ timetableId: entry.id }, { replace: true });
  }

  async function handleSaveNote() {
    if (!selectedEntry || !noteContent.trim()) return;
    await createNoteMutation.mutateAsync({
      timetableId: selectedEntry.id,
      content: noteContent.trim(),
    });
    setNoteContent("");
  }

  async function handleUpdateSelectedNote() {
    if (!selectedNote || !selectedNoteDraft.trim()) return;

    await updateNoteMutation.mutateAsync({
      noteId: selectedNote.id,
      content: selectedNoteDraft.trim()
    });
  }

  async function handleAskAIAboutSelectedNote() {
    if (!selectedNote || !aiQuestion.trim()) return;

    await assistNoteMutation.mutateAsync({
      noteId: selectedNote.id,
      question: aiQuestion.trim()
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 stagger-children">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-[0_20px_36px_-28px_rgba(15,23,42,0.9)] dark:bg-amber-900">
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
          <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] backdrop-blur-sm dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
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
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/85 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-stone-400 transition-all focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400/40"
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
                      onClick={() => handleSelectEntry(entry)}
                      className={clsx(
                        "w-full rounded-2xl border p-3 text-left transition-all duration-200",
                        isSelected
                          ? "border-teal-700/20 bg-teal-50/80 shadow-sm dark:border-teal-400/30 dark:bg-teal-950/20"
                          : "border-transparent hover:border-stone-200 hover:bg-stone-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
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
                          <div className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulse dark:bg-teal-300" />
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
            <div className="rounded-[28px] border-2 border-dashed border-stone-200 p-12 text-center dark:border-slate-700">
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
              <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "flex h-10 w-10 items-center justify-center rounded-2xl",
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
              <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] backdrop-blur-sm dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                  Add Note
                </h3>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  placeholder={`Write notes for ${selectedEntry.subjectName}...`}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/85 px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-stone-400 transition-all duration-200 focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400/40 dark:focus:ring-teal-400/15"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleSaveNote()}
                    disabled={
                      !noteContent.trim() || createNoteMutation.isPending
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-slate-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
                  >
                    <Save className="h-4 w-4" />
                    {createNoteMutation.isPending ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </div>

              {/* Existing notes */}
              <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] backdrop-blur-sm dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
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
                    {notesQuery.data.map((note: Note, index) => {
                      const isActive = selectedNote?.id === note.id;
                      const preview =
                        note.content.length > 180 ? `${note.content.slice(0, 180).trim()}...` : note.content;

                      return (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => setSelectedNote(note)}
                          className={clsx(
                            "w-full rounded-2xl border p-4 text-left transition-colors",
                            isActive
                              ? "border-teal-700/20 bg-teal-50/70 shadow-sm dark:border-teal-400/30 dark:bg-teal-950/20"
                              : "border-stone-200/80 hover:border-stone-300 dark:border-slate-700/60 dark:hover:border-slate-600"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Note {notesQuery.data.length - index}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-300">
                                {preview}
                              </p>
                            </div>
                            {isActive && (
                              <div className="mt-1 h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-300" />
                            )}
                          </div>
                          {note.timestamp && (
                            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                              {new Date(note.timestamp).toLocaleString()}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedNote && selectedEntry && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setSelectedNote(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-stone-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5 dark:border-slate-800">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Full Note
                </p>
                <h3 className="mt-2 truncate text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  {selectedEntry.subjectName}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>{formatDay(selectedEntry.dayOfWeek)}</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span>
                    {selectedEntry.startTime} - {selectedEntry.endTime}
                  </span>
                  {selectedNote.timestamp && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>{new Date(selectedNote.timestamp).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAIBox((current) => !current)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  / AI
                </button>
                {!selectedNote.summary && (
                  <button
                    type="button"
                    onClick={() => void summarizeMutation.mutateAsync(selectedNote.id)}
                    disabled={summarizeMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-600 hover:shadow-md active:scale-[0.97] disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {summarizeMutation.isPending ? "Generating..." : "Generate Summary"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedNote(null)}
                  className="rounded-2xl border border-stone-200 p-2 text-slate-500 transition-colors hover:bg-stone-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label="Close note panel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-5">
                {showAIBox && (
                  <div className="rounded-3xl border border-stone-200 bg-stone-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Ask AI About This Note
                    </p>
                    <div className="mt-3 space-y-3">
                      <input
                        value={aiQuestion}
                        onChange={(event) => setAIQuestion(event.target.value)}
                        placeholder="Ask a question about this note..."
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-teal-700/40 focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleAskAIAboutSelectedNote()}
                          disabled={!aiQuestion.trim() || assistNoteMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
                        >
                          {assistNoteMutation.isPending ? "Thinking..." : "Ask AI"}
                        </button>
                      </div>
                      {aiAnswer && (
                        <div className="rounded-2xl bg-white p-4 dark:bg-slate-950">
                          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800 dark:text-slate-200">
                            {aiAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-3xl border border-stone-200/80 bg-stone-50/70 p-6 dark:border-slate-800 dark:bg-slate-900/60">
                  <textarea
                    value={selectedNoteDraft}
                    onChange={(event) => setSelectedNoteDraft(event.target.value)}
                    rows={16}
                    className="min-h-[360px] w-full resize-none bg-transparent text-[15px] leading-8 text-slate-800 focus:outline-none dark:text-slate-200"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleUpdateSelectedNote()}
                    disabled={!selectedNoteDraft.trim() || selectedNoteDraft.trim() === selectedNote.content.trim() || updateNoteMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-slate-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
                  >
                    <Save className="h-4 w-4" />
                    {updateNoteMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                {selectedNote.summary && (
                  <div className="flex gap-3 rounded-3xl bg-emerald-50 p-5 dark:bg-emerald-950/40">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                        Summary
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-emerald-900 dark:text-emerald-100">
                        {selectedNote.summary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
