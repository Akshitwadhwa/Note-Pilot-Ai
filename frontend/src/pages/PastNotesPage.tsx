import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  History,
  FileText,
  CalendarDays,
  Clock,
  BookOpen,
  Upload,
  FolderOpen,
  HardDriveUpload,
  Save,
  Sparkles,
  Search,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getCourseDetail, listCourses, uploadCourseDocument } from "../features/courses/api";
import {
  analyzeGoogleClassroomMaterial,
  getGoogleClassroomMaterialDetail,
  listGoogleClassroomMaterials
} from "../features/google-classroom/api";
import { listTimetableEntries } from "../features/timetable/api";
import { createNote, listNotes, summarizeNote, updateNote } from "../features/notes/api";
import type { TimetableEntry, Note, DayOfWeek } from "../types/domain";
import { isLikelySameCourse } from "../utils/course-matching";
import { buildMaterialNoteContent } from "../utils/material-note";
import { formatSessionDate, getTodayLocalDateValue } from "../utils/date";

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

function buildNoteSection(label: string, content?: string | null) {
  const trimmed = content?.trim();
  if (!trimmed) {
    return "";
  }

  return `${label}\n${trimmed}\n`;
}

type SelectedCourseResource =
  | { kind: "document"; id: string }
  | { kind: "material"; id: string };

export function PastNotesPage() {
  const { userId, userReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSessionDate, setSelectedSessionDate] = useState(getTodayLocalDateValue());
  const [selectedNoteDraft, setSelectedNoteDraft] = useState("");
  const [showResourcePanel, setShowResourcePanel] = useState(false);
  const [resourceMode, setResourceMode] = useState<"menu" | "device" | "course">("menu");
  const [selectedCourseResource, setSelectedCourseResource] = useState<SelectedCourseResource | null>(null);
  const deviceUploadInputRef = useRef<HTMLInputElement | null>(null);
  const resourcePreviewRef = useRef<HTMLDivElement | null>(null);

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
    onSuccess: async (savedNote) => {
      setSelectedNote(savedNote);
      setSelectedNoteDraft(savedNote.content);
      setSelectedSessionDate(savedNote.sessionDate);
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

  const coursesQuery = useQuery({
    queryKey: ["courses", userId],
    queryFn: listCourses,
    enabled: userReady,
    retry: false
  });

  const classroomMaterialsQuery = useQuery({
    queryKey: ["google-classroom-materials", userId],
    queryFn: listGoogleClassroomMaterials,
    enabled: userReady,
    retry: false
  });

  const matchedCourse = useMemo(() => {
    if (!selectedEntry) {
      return null;
    }

    return (
      (coursesQuery.data ?? []).find((course) => isLikelySameCourse(course.name, selectedEntry.subjectName)) ?? null
    );
  }, [coursesQuery.data, selectedEntry]);

  const courseDetailQuery = useQuery({
    queryKey: ["course-detail", matchedCourse?.id, userId],
    queryFn: () => getCourseDetail(matchedCourse!.id),
    enabled: Boolean(matchedCourse?.id) && userReady
  });

  const uploadCourseDocumentMutation = useMutation({
    mutationFn: ({ courseId, file }: { courseId: string; file: File }) => uploadCourseDocument(courseId, file),
    onSuccess: async () => {
      if (matchedCourse?.id) {
        await queryClient.invalidateQueries({
          queryKey: ["course-detail", matchedCourse.id, userId]
        });
      }
      addToast("File uploaded to this course", "success");
      setShowResourcePanel(true);
      setResourceMode("course");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to upload file", "error");
    }
  });

  const selectedDocument = useMemo(() => {
    if (selectedCourseResource?.kind !== "document") {
      return null;
    }

    return (
      courseDetailQuery.data?.documents.find((document) => document.id === selectedCourseResource.id) ?? null
    );
  }, [courseDetailQuery.data?.documents, selectedCourseResource]);

  const materialDetailQuery = useQuery({
    queryKey: ["google-classroom-material-detail", selectedCourseResource?.kind === "material" ? selectedCourseResource.id : null, userId],
    queryFn: () => getGoogleClassroomMaterialDetail(selectedCourseResource!.id),
    enabled: showResourcePanel && resourceMode === "course" && selectedCourseResource?.kind === "material" && userReady,
    retry: false
  });

  const analyzeMaterialMutation = useMutation({
    mutationFn: analyzeGoogleClassroomMaterial,
    onSuccess: async (_, materialId) => {
      await queryClient.invalidateQueries({
        queryKey: ["google-classroom-material-detail", materialId, userId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["google-classroom-materials", userId]
      });
      addToast("Material summary generated", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to summarize material", "error");
    }
  });

  const relatedCourseNotes = useMemo(() => {
    if (!selectedEntry) {
      return [];
    }

    if (courseDetailQuery.data?.notes?.length) {
      return courseDetailQuery.data.notes;
    }

    return (notesQuery.data ?? []).map((note) => ({
      ...note,
      timetableEntry: selectedEntry
    }));
  }, [courseDetailQuery.data?.notes, notesQuery.data, selectedEntry]);

  const relatedClassroomMaterials = useMemo(() => {
    if (!selectedEntry) {
      return [];
    }

    if (courseDetailQuery.data?.googleClassroomMaterials?.length) {
      return courseDetailQuery.data.googleClassroomMaterials;
    }

    return (classroomMaterialsQuery.data ?? []).filter((material) =>
      isLikelySameCourse(material.courseName ?? "", selectedEntry.subjectName)
    );
  }, [classroomMaterialsQuery.data, courseDetailQuery.data?.googleClassroomMaterials, selectedEntry]);

  const entries = timetableQuery.data ?? [];
  const preselectedEntryId = searchParams.get("timetableId");
  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.dayOfWeek.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;
  const notesGroupedBySessionDate = useMemo(
    () =>
      (notesQuery.data ?? []).reduce<Record<string, Note[]>>((acc, note) => {
        acc[note.sessionDate] ??= [];
        acc[note.sessionDate].push(note);
        return acc;
      }, {}),
    [notesQuery.data]
  );
  const selectedDateNotes = useMemo(
    () => (notesQuery.data ?? []).filter((note) => note.sessionDate === selectedSessionDate),
    [notesQuery.data, selectedSessionDate]
  );
  const selectedDatePrimaryNote = selectedDateNotes[0] ?? null;

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
          setSelectedSessionDate(getTodayLocalDateValue());
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
      setShowResourcePanel(false);
      setResourceMode("menu");
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
    setShowResourcePanel(false);
    setResourceMode("menu");
  }, [selectedNote?.id]);

  function handleSelectEntry(entry: TimetableEntry) {
    setSelectedEntry(entry);
    setSelectedNote(null);
    setNoteContent("");
    setSelectedSessionDate(getTodayLocalDateValue());
    setSearchParams({ timetableId: entry.id }, { replace: true });
  }

  function handleOpenResourceMode(mode: "device" | "course") {
    setShowResourcePanel(true);
    setResourceMode(mode);
    if (mode !== "course") {
      setSelectedCourseResource(null);
    }
  }

  function handleSelectCourseResource(resource: SelectedCourseResource) {
    setSelectedCourseResource(resource);

    requestAnimationFrame(() => {
      resourcePreviewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });
  }

  function handleDeviceUploadSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !matchedCourse?.id) {
      return;
    }

    void uploadCourseDocumentMutation.mutateAsync({
      courseId: matchedCourse.id,
      file
    });
  }

  async function handleSaveNote() {
    if (!selectedEntry || !noteContent.trim()) return;
    await createNoteMutation.mutateAsync({
      timetableId: selectedEntry.id,
      sessionDate: selectedSessionDate,
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

  function appendResourceToNote(section: string) {
    if (!section.trim()) {
      return;
    }

    setSelectedNoteDraft((current) => {
      const normalizedCurrent = current.trimEnd();
      return normalizedCurrent ? `${normalizedCurrent}\n\n${section.trim()}` : section.trim();
    });
  }

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    const existingNote = (notesQuery.data ?? []).find((note) => note.sessionDate === selectedSessionDate) ?? null;
    setNoteContent(existingNote?.content ?? "");
  }, [notesQuery.data, selectedEntry?.id, selectedSessionDate]);

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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

                  <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Session Date
                    </label>
                    <input
                      type="date"
                      value={selectedSessionDate}
                      onChange={(event) => setSelectedSessionDate(event.target.value)}
                      className="mt-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-teal-700/40 focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-teal-400/40"
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Saving notes for {formatSessionDate(selectedSessionDate)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-teal-700 dark:text-teal-300">
                      {selectedDatePrimaryNote
                        ? "A note already exists for this class date. Saving will update it."
                        : "No note exists for this class date yet."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Note composer */}
              <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] backdrop-blur-sm dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                  {selectedDatePrimaryNote ? "Update Note" : "Add Note"}
                </h3>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  placeholder={`Write notes for ${selectedEntry.subjectName} on ${formatSessionDate(selectedSessionDate)}...`}
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
                    {createNoteMutation.isPending
                      ? "Saving..."
                      : selectedDatePrimaryNote
                        ? `Update ${formatSessionDate(selectedSessionDate)} Note`
                        : `Save ${formatSessionDate(selectedSessionDate)} Note`}
                  </button>
                </div>
              </div>

              {/* Existing notes */}
              <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] backdrop-blur-sm dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
                <h3 className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <History className="h-4 w-4 text-amber-500" />
                    Saved Notes By Date
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
                  <div className="space-y-4">
                    {Object.entries(notesGroupedBySessionDate).map(([sessionDate, sessionNotes]) => (
                      <div key={sessionDate} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 px-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            {formatSessionDate(sessionDate)}
                          </p>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {sessionNotes.length} note{sessionNotes.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        {sessionNotes.map((note) => {
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
                                    {formatSessionDate(note.sessionDate)}
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
                                  Saved {new Date(note.timestamp).toLocaleString()}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
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
            className="fixed inset-x-0 bottom-0 top-[73px] z-40 bg-slate-950/30 backdrop-blur-[2px] lg:left-72"
            onClick={() => setSelectedNote(null)}
          />
          <aside className="fixed bottom-0 right-0 top-[73px] z-50 flex w-full max-w-[min(48rem,calc(100vw-1.5rem))] flex-col overflow-hidden border-l border-stone-200 bg-white shadow-[-24px_0_80px_-40px_rgba(15,23,42,0.42)] sm:max-w-[42rem] lg:right-0 lg:max-w-[44rem] lg:rounded-tl-[32px] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 border-b border-stone-200 bg-white/92 px-5 py-5 backdrop-blur sm:px-6 lg:flex-row lg:items-start lg:justify-between dark:border-slate-800 dark:bg-slate-950/92">
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
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span>{formatSessionDate(selectedNote.sessionDate)}</span>
                  {selectedNote.timestamp && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>{new Date(selectedNote.timestamp).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <input
                  ref={deviceUploadInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleDeviceUploadSelection}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowResourcePanel((current) => !current);
                    setResourceMode("menu");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Upload className="h-4 w-4" />
                  Upload
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

            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
              <div className="space-y-5">
                {showResourcePanel && (
                  <div className="rounded-3xl border border-stone-200 bg-stone-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Course Resources
                        </p>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                          Current class: <span className="font-semibold">{selectedEntry.subjectName}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowResourcePanel(false);
                          setResourceMode("menu");
                          setSelectedCourseResource(null);
                        }}
                        className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Close
                      </button>
                    </div>

                    {resourceMode === "menu" && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => handleOpenResourceMode("device")}
                          className="rounded-2xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-stone-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600"
                        >
                          <HardDriveUpload className="h-5 w-5 text-teal-700 dark:text-teal-300" />
                          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Upload from device
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Add a file from this device into the current course context.
                          </p>
                        </button>
                          <button
                            type="button"
                            onClick={() => handleOpenResourceMode("course")}
                          className="rounded-2xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-stone-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600"
                        >
                          <FolderOpen className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            From course
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Browse notes, PDFs, and Classroom materials from this selected class.
                          </p>
                        </button>
                      </div>
                    )}

                    {resourceMode === "device" && (
                      <div className="mt-4 space-y-3">
                        {matchedCourse ? (
                          <>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              Upload into <span className="font-semibold">{matchedCourse.name}</span>.
                            </p>
                            <button
                              type="button"
                              onClick={() => deviceUploadInputRef.current?.click()}
                              disabled={uploadCourseDocumentMutation.isPending}
                              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
                            >
                              <Upload className="h-4 w-4" />
                              {uploadCourseDocumentMutation.isPending ? "Uploading..." : "Choose file from device"}
                            </button>
                          </>
                        ) : (
                          <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            No matching course record was found for this class yet, so device uploads are not available here.
                          </p>
                        )}
                      </div>
                    )}

                    {resourceMode === "course" && (
                      <div className="mt-4 space-y-4">
                        {courseDetailQuery.isLoading ? (
                          <div className="space-y-2">
                            <div className="skeleton h-20 w-full rounded-2xl" />
                            <div className="skeleton h-20 w-full rounded-2xl" />
                          </div>
                        ) : !matchedCourse || !courseDetailQuery.data ? (
                          <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            No linked course content was found for this class yet.
                          </p>
                        ) : (
                          <>
                            <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Course
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {courseDetailQuery.data.course.name}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Course Notes
                              </p>
                              {relatedCourseNotes.length === 0 ? (
                                <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                  No related notes found.
                                </p>
                              ) : (
                                relatedCourseNotes.slice(0, 4).map((note) => (
                                  <div
                                    key={note.id}
                                    className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                                  >
                                    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">
                                      {note.content}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                PDFs and Handouts
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Click a handout to preview its summary and insert it into your note.
                              </p>
                              {courseDetailQuery.data.documents.length === 0 ? (
                                <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                  No uploaded handouts yet.
                                </p>
                              ) : (
                                courseDetailQuery.data.documents.map((document) => (
                                  <button
                                    key={document.id}
                                    type="button"
                                    onClick={() => handleSelectCourseResource({ kind: "document", id: document.id })}
                                    className={clsx(
                                      "w-full cursor-pointer rounded-2xl border bg-white p-4 text-left transition-colors dark:bg-slate-950",
                                      selectedCourseResource?.kind === "document" && selectedCourseResource.id === document.id
                                        ? "border-teal-700/30 shadow-sm dark:border-teal-400/40"
                                        : "border-stone-200 hover:border-stone-300 dark:border-slate-700 dark:hover:border-slate-600"
                                    )}
                                  >
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {document.fileName}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      {document.mimeType}
                                    </p>
                                  </button>
                                ))
                              )}
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Classroom Materials
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Click a synced material to open its summary and attachments below.
                              </p>
                              {relatedClassroomMaterials.length === 0 ? (
                                <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                  No synced Classroom materials yet.
                                </p>
                              ) : (
                                relatedClassroomMaterials.map((material) => (
                                  <button
                                    key={material.id}
                                    type="button"
                                    onClick={() => handleSelectCourseResource({ kind: "material", id: material.id })}
                                    className={clsx(
                                      "w-full cursor-pointer rounded-2xl border bg-white p-4 text-left transition-colors dark:bg-slate-950",
                                      selectedCourseResource?.kind === "material" && selectedCourseResource.id === material.id
                                        ? "border-teal-700/30 shadow-sm dark:border-teal-400/40"
                                        : "border-stone-200 hover:border-stone-300 dark:border-slate-700 dark:hover:border-slate-600"
                                    )}
                                  >
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {material.title}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      {material.attachments[0]?.title || material.sourceType}
                                    </p>
                                  </button>
                                ))
                              )}
                            </div>

                            {selectedDocument ? (
                              <div
                                ref={resourcePreviewRef}
                                className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/40 dark:bg-teal-950/20"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
                                      Handout Summary
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {selectedDocument.fileName}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      appendResourceToNote(
                                        buildNoteSection(
                                          `Handout summary: ${selectedDocument.fileName}`,
                                          selectedDocument.syllabusSummary ||
                                            selectedDocument.evaluationCriteria ||
                                            selectedDocument.extractedText?.slice(0, 1200) ||
                                            ""
                                        )
                                      )
                                    }
                                    className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-50 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200 dark:hover:bg-teal-950/40"
                                  >
                                    Add to note
                                  </button>
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                                  {selectedDocument.syllabusSummary ||
                                    selectedDocument.evaluationCriteria ||
                                    selectedDocument.extractedText?.slice(0, 800) ||
                                    "No extracted summary is available for this handout yet."}
                                  {selectedDocument.extractedText && selectedDocument.extractedText.length > 800 ? "..." : ""}
                                </p>
                              </div>
                            ) : null}

                            {selectedCourseResource?.kind === "material" ? (
                              materialDetailQuery.isLoading ? (
                                <div ref={resourcePreviewRef} className="space-y-2">
                                  <div className="skeleton h-24 w-full rounded-2xl" />
                                  <div className="skeleton h-20 w-full rounded-2xl" />
                                </div>
                              ) : materialDetailQuery.data ? (
                                <div
                                  ref={resourcePreviewRef}
                                  className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/40 dark:bg-teal-950/20"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
                                        Material Summary
                                      </p>
                                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {materialDetailQuery.data.title}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      {materialDetailQuery.data.analysis?.summary || materialDetailQuery.data.extractedText ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            appendResourceToNote(
                                              buildNoteSection(
                                                `Classroom material: ${materialDetailQuery.data.title}`,
                                                buildMaterialNoteContent({
                                                  title: materialDetailQuery.data.title,
                                                  analysis: materialDetailQuery.data.analysis,
                                                  extractedText: materialDetailQuery.data.extractedText,
                                                  description: materialDetailQuery.data.description,
                                                  attachments: materialDetailQuery.data.attachments
                                                })
                                              )
                                            )
                                          }
                                          className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-50 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200 dark:hover:bg-teal-950/40"
                                        >
                                          Add to note
                                        </button>
                                      ) : null}
                                      {!materialDetailQuery.data.analysis ? (
                                        <button
                                          type="button"
                                          onClick={() => void analyzeMaterialMutation.mutateAsync(materialDetailQuery.data.id)}
                                          disabled={analyzeMaterialMutation.isPending}
                                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
                                        >
                                          {analyzeMaterialMutation.isPending ? "Summarizing..." : "Summarize"}
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>

                                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                                    {materialDetailQuery.data.analysis?.summary ||
                                      materialDetailQuery.data.extractedText?.slice(0, 800) ||
                                      materialDetailQuery.data.description ||
                                      "No summary is available for this material yet."}
                                    {materialDetailQuery.data.extractedText &&
                                    !materialDetailQuery.data.analysis?.summary &&
                                    materialDetailQuery.data.extractedText.length > 800
                                      ? "..."
                                      : ""}
                                  </p>

                                  {materialDetailQuery.data.attachments.length > 0 ? (
                                    <div className="mt-4 space-y-2">
                                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                        Attachments
                                      </p>
                                      {materialDetailQuery.data.attachments.map((attachment) => (
                                        <div
                                          key={attachment.id}
                                          className="rounded-xl border border-stone-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div>
                                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {attachment.title || "Untitled attachment"}
                                              </p>
                                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                {attachment.mimeType || attachment.attachmentType}
                                              </p>
                                            </div>
                                            {attachment.url ? (
                                              <a
                                                href={attachment.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-semibold text-teal-800 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
                                              >
                                                Open
                                              </a>
                                            ) : null}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
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
